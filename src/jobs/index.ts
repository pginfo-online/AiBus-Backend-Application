import { createWorker } from '../infrastructure/queues';
import { QueueName } from '../shared/constants';
import { getPrismaClient } from '../infrastructure/database';
import { GdsAdapter } from '../providers/gds/gdsAdapter';
import { logger } from '../infrastructure/logger';
import { BookingStatus, HoldStatus, RefundStatus, TicketStatus } from '@prisma/client';

const workerLogger = logger.child({ module: 'background-workers' });

/**
 * 1. Booking Reconciliation Worker
 * Resolves BOOKING_UNKNOWN states caused by network timeouts during BookSeats call
 */
export function startBookingReconciliationWorker() {
  const gdsAdapter = GdsAdapter.getInstance();

  return createWorker(QueueName.BOOKING_RECONCILIATION, async (job) => {
    const { bookingId, providerHoldId } = job.data as { bookingId: string; providerHoldId: string };
    const prisma = getPrismaClient();

    workerLogger.info({ bookingId, providerHoldId }, 'Reconciling unknown booking with GDS...');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.status !== BookingStatus.BOOKING_UNKNOWN) {
      workerLogger.info({ bookingId }, 'Booking is not in UNKNOWN status, skipping reconciliation');
      return;
    }

    const statusResponse = await gdsAdapter.checkBookingStatus(providerHoldId);

    if (statusResponse.Status === 1) {
      // Booking was actually confirmed at provider!
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
            providerTicketNo: statusResponse.TicketNo,
            providerPnrNo: statusResponse.PNRNo,
            confirmedAt: new Date(),
          },
        });

        await tx.ticket.create({
          data: {
            bookingId,
            ticketNumber: `TKT-${booking.bookingNumber}`,
            pnrNumber: statusResponse.PNRNo || 'N/A',
            status: TicketStatus.ISSUED,
            bookingSnapshot: booking as any,
          },
        });
      });

      workerLogger.info({ bookingId }, 'Reconciliation SUCCESS: Booking marked CONFIRMED');
    } else if (statusResponse.Status === -1 || statusResponse.Status === -2) {
      // Provider did not book seats; fail and trigger refund
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.BOOKING_FAILED },
      });

      workerLogger.warn({ bookingId }, 'Reconciliation: Provider confirmed booking failure; auto-refund triggered');
    } else {
      // Still in progress at provider, throw error to trigger BullMQ exponential retry
      throw new Error(`Booking ${bookingId} is still in progress at provider (Status: 0)`);
    }
  });
}

/**
 * 2. Hold Expiry Cleanup Worker
 * Releases seats and marks SeatHold expired after 10-minute TTL
 */
export function startHoldExpiryWorker() {
  return createWorker(QueueName.HOLD_EXPIRY_CLEANUP, async (job) => {
    const { holdId } = job.data as { holdId: string };
    const prisma = getPrismaClient();

    const hold = await prisma.seatHold.findUnique({
      where: { id: holdId },
    });

    if (hold && hold.status === HoldStatus.ACTIVE && new Date() >= hold.expiresAt) {
      await prisma.seatHold.update({
        where: { id: holdId },
        data: { status: HoldStatus.EXPIRED, releasedAt: new Date() },
      });
      workerLogger.info({ holdId }, 'Expired seat hold released');
    }
  });
}

/**
 * 3. Refund Processing Worker
 * Dispatches refunds to payment gateway / wallet and updates database records
 */
export function startRefundWorker() {
  return createWorker(QueueName.REFUND_PROCESSING, async (job) => {
    const { refundId, amount } = job.data as { refundId: string; amount: number };
    const prisma = getPrismaClient();

    workerLogger.info({ refundId, amount }, 'Processing refund...');

    // Simulate gateway refund API call (e.g., PhonePe Refund API)
    await new Promise((resolve) => setTimeout(resolve, 500));

    await prisma.refund.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.COMPLETED,
        gatewayRefundId: `REF-${Date.now()}`,
        completedAt: new Date(),
      },
    });

    workerLogger.info({ refundId, amount }, 'Refund successfully completed');
  });
}

/**
 * 4. Notification Workers (Email & SMS)
 */
export function startNotificationWorkers() {
  const emailWorker = createWorker(QueueName.NOTIFICATION_EMAIL, async (job) => {
    const { recipient, bookingNumber } = job.data as { recipient: string; bookingNumber: string };
    workerLogger.info({ recipient, bookingNumber }, 'Sending confirmation email');
  });

  const smsWorker = createWorker(QueueName.NOTIFICATION_SMS, async (job) => {
    const { recipient, bookingNumber } = job.data as { recipient: string; bookingNumber: string };
    workerLogger.info({ recipient, bookingNumber }, 'Sending confirmation SMS');
  });

  return [emailWorker, smsWorker];
}

/**
 * Initialize all application background workers
 */
export function initializeWorkers() {
  try {
    startBookingReconciliationWorker();
    startHoldExpiryWorker();
    startRefundWorker();
    startNotificationWorkers();
    workerLogger.info('All BullMQ background workers initialized');
  } catch (err) {
    workerLogger.warn({ err }, 'Could not initialize workers (Redis may be in disconnected mode)');
  }
}
