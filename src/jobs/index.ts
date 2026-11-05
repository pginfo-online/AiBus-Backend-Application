import { createWorker } from '../infrastructure/queues';
import { QueueName } from '../shared/constants';
import { getPrismaClient } from '../infrastructure/database';
import { GdsAdapter } from '../providers/gds/gdsAdapter';
import { logger } from '../infrastructure/logger';
import { BookingStatus, HoldStatus, PaymentStatus, RefundStatus, TicketStatus } from '@prisma/client';
import { env } from '../config/env';
import { LedgerManagementService } from '../modules/admin/ledger-management/ledger-management.service';
import { buildLedgerPostingData, buildRefundLines } from '../infrastructure/ledger';
import { PaymentOrchestrator } from '../infrastructure/payments';

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

    if (!booking || (booking.status !== BookingStatus.BOOKING_UNKNOWN
      && booking.status !== BookingStatus.BOOKING_REQUESTED
      && booking.status !== BookingStatus.BOOKING_FAILED)) {
      workerLogger.info({ bookingId }, 'Booking is not in UNKNOWN status, skipping reconciliation');
      return;
    }

    const statusResponse = booking.status === BookingStatus.BOOKING_FAILED
      ? { Status: -1, TicketNo: undefined, PNRNo: undefined }
      : await gdsAdapter.checkBookingStatus(providerHoldId);

    if (statusResponse.Status === 1 && statusResponse.TicketNo && statusResponse.PNRNo) {
      // Booking was confirmed at provider! Atomically update booking + create ticket
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

        // Create Ticket record idempotently using actual 3rd party provider TicketNo
        const existingTicket = await tx.ticket.findUnique({ where: { bookingId } });
        const ticketNumber = String(statusResponse.TicketNo || booking.providerTicketNo || booking.bookingNumber);
        if (!existingTicket) {
          await tx.ticket.create({
            data: {
              bookingId,
              ticketNumber,
              pnrNumber: statusResponse.PNRNo || booking.providerPnrNo || 'N/A',
              status: TicketStatus.ISSUED,
              bookingSnapshot: booking as any,
            },
          });
        } else if (statusResponse.TicketNo && existingTicket.ticketNumber.startsWith('TKT-')) {
          await tx.ticket.update({
            where: { id: existingTicket.id },
            data: { ticketNumber: String(statusResponse.TicketNo) },
          });
        }
      });

      // Queue confirmation notifications
      try {
        const { addJob } = await import('../infrastructure/queues');
        await addJob(QueueName.NOTIFICATION_EMAIL, 'booking-confirmation-email', {
          bookingId,
          recipient: booking.contactEmail,
          bookingNumber: booking.bookingNumber,
        });
        await addJob(QueueName.NOTIFICATION_SMS, 'booking-confirmation-sms', {
          bookingId,
          recipient: booking.contactPhone,
          bookingNumber: booking.bookingNumber,
        });
      } catch (queueErr) {
        workerLogger.warn({ queueErr }, 'Failed to queue notifications after reconciliation confirm');
      }

      workerLogger.info({ bookingId }, 'Reconciliation SUCCESS: Booking marked CONFIRMED and ticket issued');
    } else if (statusResponse.Status === -1 || statusResponse.Status === -2) {
      const refund = await prisma.$transaction(async (tx) => {
        const key = `booking-failure:${bookingId}`;
        const transitioned = await tx.booking.updateMany({
          where: { id: bookingId, status: { in: [BookingStatus.BOOKING_UNKNOWN, BookingStatus.BOOKING_REQUESTED] } },
          data: { status: BookingStatus.BOOKING_FAILED, version: { increment: 1 } },
        });
        if (!transitioned.count) {
          return tx.refund.findUnique({ where: { idempotencyKey: key } });
        }
        const payment = await tx.payment.findFirst({ where: { bookingId, status: PaymentStatus.SUCCESS } });
        if (!payment) return null;
        const walletRefund = payment.gateway === 'WALLET' && Boolean(booking.agentId);
        const refund = await tx.refund.create({
          data: {
            bookingId, paymentId: payment.id, userId: booking.userId,
            amount: payment.amount, idempotencyKey: key,
            status: walletRefund ? RefundStatus.COMPLETED : RefundStatus.PENDING,
            destination: walletRefund ? 'WALLET' : 'ORIGINAL_PAYMENT_METHOD',
            completedAt: walletRefund ? new Date() : null,
            reason: 'Booking failed at provider after reconciliation',
          },
        });
        if (walletRefund && booking.agentId) {
          const agentId = booking.agentId;
          const snapshot = await tx.commissionSnapshot.findUnique({ where: { bookingId } });
          const wallet = await tx.agentWallet.findUniqueOrThrow({ where: { agentId } });
          const amount = Number(payment.amount);
          const commissionReversal = Number(snapshot?.commissionAmt ?? 0);
          const metadata = payment.metadata as { creditDebited?: number } | null;
          const creditRepayment = Math.min(Number(wallet.creditUsed), metadata?.creditDebited ?? 0, amount);
          await tx.agentWallet.update({
            where: { agentId, version: wallet.version },
            data: {
              cashBalance: { increment: amount - creditRepayment },
              creditUsed: { decrement: creditRepayment },
              totalRefunds: { increment: amount },
              version: { increment: 1 },
            },
          });
          const lines = buildRefundLines({
            bookingId, cancellationId: refund.id, agentId,
            refundAmount: amount + commissionReversal, commissionReversal, idempotencyPrefix: key,
          });
          await tx.ledgerEntry.createMany({ data: buildLedgerPostingData({ agentId, bookingId, createdBy: 'SYSTEM', lines }) });
          if (snapshot) {
            await tx.commissionSnapshot.update({
              where: { bookingId }, data: { reversalAmt: commissionReversal, reversedAt: new Date() },
            });
          }
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.REFUNDED } });
        }
        return refund;
      });
      if (refund && refund.status !== RefundStatus.COMPLETED) {
        const { addJob } = await import('../infrastructure/queues');
        const job = await addJob(QueueName.REFUND_PROCESSING, 'process-refund', { refundId: refund.id }, {
          jobId: `refund-${refund.id}`, attempts: 8, backoff: { type: 'exponential', delay: 30_000 },
        });
        if (!job) throw new Error('Could not enqueue refund');
      }
    } else {
      // Status 0 or unknown = still in progress at provider; retry via BullMQ exponential backoff
      throw new Error(`Booking ${bookingId} is still in progress at provider (Status: ${statusResponse.Status})`);
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

    const hold = await prisma.seatHold.findUnique({ where: { id: holdId } });

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
 * Dispatches refunds to payment gateway (Razorpay) and updates database records
 */
export function startRefundWorker() {
  return createWorker(QueueName.REFUND_PROCESSING, async (job) => {
    const { refundId, gatewayPaymentId, merchantTxnId } = job.data as {
      refundId: string;
      gatewayPaymentId?: string;
      merchantTxnId?: string;
    };
    const prisma = getPrismaClient();

    workerLogger.info({ refundId }, 'Processing refund');

    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: { payment: true, booking: true },
    });

    if (!refund) {
      workerLogger.warn({ refundId }, 'Refund not found, skipping');
      return;
    }

    if (refund.status === RefundStatus.COMPLETED) {
      workerLogger.info({ refundId }, 'Refund already completed (idempotent)');
      return;
    }

    // Mark as PROCESSING
    await prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.PROCESSING, retryCount: { increment: 1 } },
    });

    const originalTxnId = merchantTxnId || refund.payment?.merchantTxnId;
    const originalPaymentId = gatewayPaymentId || refund.payment?.gatewayPaymentId;
    const targetGateway = refund.payment?.gateway;

    if (targetGateway === 'RAZORPAY' && originalPaymentId) {
      const merchantRefundId = refundId;
      const orchestrator = PaymentOrchestrator.getInstance();
      const refundResult = await orchestrator.processRefund(targetGateway, {
        merchantRefundId,
        originalMerchantTxnId: originalTxnId || merchantRefundId,
        gatewayPaymentId: originalPaymentId,
        gatewayRefundId: refund.gatewayRefundId ?? undefined,
        amount: Number(refund.amount),
        reason: 'AiBus booking cancellation/refund',
      });

      if (refundResult.success) {
        await prisma.$transaction(async (tx) => {
          await tx.refund.update({
            where: { id: refundId },
            data: {
              status: RefundStatus.COMPLETED,
              gatewayRefundId: refundResult.gatewayRefundId || merchantRefundId,
              completedAt: new Date(),
            },
          });

          // Update payment status to REFUNDED if full refund
          if (refund.payment) {
            const totalRefunded = Number(refund.amount);
            const totalPaid = Number(refund.payment.amount);
            const newPaymentStatus =
              totalRefunded >= totalPaid ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
            await tx.payment.update({
              where: { id: refund.payment.id },
              data: { status: newPaymentStatus },
            });
          }

          // Update booking status to REFUNDED if applicable
          if (refund.booking) {
            await tx.booking.update({
              where: { id: refund.bookingId },
              data: { status: BookingStatus.REFUNDED },
            });
          }
        });

        workerLogger.info(
          { refundId, amount: Number(refund.amount), gateway: refundResult.gateway, gatewayRefundId: refundResult.gatewayRefundId },
          'Refund successfully processed via gateway'
        );
      } else {
        const pending = refundResult.code === 'REFUND_PENDING';
        await prisma.refund.updateMany({
          where: { id: refundId, status: { not: RefundStatus.COMPLETED } },
          data: {
            status: pending ? RefundStatus.PROCESSING : RefundStatus.FAILED,
            gatewayRefundId: refundResult.gatewayRefundId,
          },
        });
        workerLogger.error(
          { refundId, gateway: targetGateway, code: refundResult.code, message: refundResult.message },
          'Gateway refund API returned failure — will retry'
        );
        throw new Error(`${targetGateway} refund failed with code: ${refundResult.code}`);
      }
    } else {
      // No payment transaction ID to refund against — mark as FAILED for manual review
      await prisma.refund.update({
        where: { id: refundId },
        data: { status: RefundStatus.FAILED },
      });
      workerLogger.error(
        { refundId },
        'Cannot process refund automatically: original Razorpay payment required'
      );
    }
  });
}

/**
 * 4. Notification Workers (Email & SMS)
 */
export function startNotificationWorkers() {
  const emailWorker = createWorker(QueueName.NOTIFICATION_EMAIL, async (job) => {
    const { recipient, bookingNumber } = job.data as { recipient: string; bookingNumber: string };
    workerLogger.info({ recipient, bookingNumber }, 'Sending booking confirmation email');
    // TODO: Integrate with email service (SendGrid, Postmark, etc.)
  });

  const smsWorker = createWorker(QueueName.NOTIFICATION_SMS, async (job) => {
    const { recipient, bookingNumber } = job.data as { recipient: string; bookingNumber: string };
    workerLogger.info({ recipient, bookingNumber }, 'Sending booking confirmation SMS');
    // TODO: Integrate with SMS service (Twilio, MSG91, etc.)
  });

  return [emailWorker, smsWorker];
}

/**
 * 5. Ticket Generation Worker
 * Generates branded PDF ticket and persists access URL
 */
export function startTicketGenerationWorker() {
  return createWorker(QueueName.TICKET_GENERATION, async (job) => {
    const { bookingId } = job.data as { bookingId: string };
    const prisma = getPrismaClient();

    workerLogger.info({ bookingId }, 'Generating ticket PDF in background worker...');

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passengers: true,
        seats: true,
        ticket: true,
      },
    });

    if (!booking || !booking.ticket) {
      workerLogger.warn({ bookingId }, 'Booking or ticket record not found for PDF generation');
      return;
    }

    if (booking.ticket.pdfUrl && booking.ticket.status === TicketStatus.ISSUED) {
      workerLogger.info({ bookingId }, 'Ticket PDF already issued (idempotent)');
      return;
    }

    const ticketPdfUrl = `/api/${env.API_VERSION}/tickets/booking/${booking.id}/pdf`;

    await prisma.ticket.update({
      where: { id: booking.ticket.id },
      data: {
        pdfUrl: ticketPdfUrl,
        status: TicketStatus.ISSUED,
        generatedAt: new Date(),
      },
    });

    workerLogger.info({ bookingId, ticketPdfUrl }, 'Ticket PDF generation complete');
  });
}

/**
 * 6. Daily Ledger Reconciliation Worker
 * Audits all agent wallet cash balances against the sum of double-entry ledger journal postings
 * Emits alert logs whenever an un-reconciled discrepancy is detected
 */
export function startLedgerReconciliationWorker() {
  return createWorker(QueueName.LEDGER_RECONCILIATION, async (job) => {
    workerLogger.info({ jobId: job.id }, 'Starting scheduled agent ledger reconciliation audit...');
    const ledgerManagementService = LedgerManagementService.getInstance();
    const report = await ledgerManagementService.getReconciliationReport();

    if (report.discrepantAgents > 0) {
      const discrepancies = report.agents
        .filter((a) => a.reconciliationStatus === 'DISCREPANCY_DETECTED')
        .map((a) => ({
          agentId: a.agentId,
          businessName: a.businessName,
          walletBalance: a.currentBalance,
          ledgerSum: a.calculatedBalance,
          discrepancy: a.discrepancy,
        }));

      workerLogger.error(
        {
          totalAudited: report.totalAgentsAudited,
          discrepantCount: report.discrepantAgents,
          discrepancies,
        },
        'CRITICAL FINANCIAL AUDIT ALERT: Discrepancy detected between AgentWallet balance and double-entry LedgerEntries!'
      );
    } else {
      workerLogger.info(
        {
          totalAudited: report.totalAgentsAudited,
          matchedAgents: report.matchedAgents,
        },
        'Agent ledger reconciliation audit SUCCESS: 100% of agent wallets match double-entry ledger journal.'
      );
    }
  });
}

export async function scheduleDailyReconciliationJob() {
  try {
    const { scheduleRecurringJob } = await import('../infrastructure/queues');
    await scheduleRecurringJob(
      QueueName.LEDGER_RECONCILIATION,
      'daily-ledger-reconciliation',
      { pattern: '0 2 * * *' }, // Daily at 02:00 AM UTC
      { name: 'daily-ledger-reconciliation', data: {} }
    );
    workerLogger.info('Daily ledger reconciliation job scheduled (02:00 UTC)');
  } catch (err: any) {
    workerLogger.warn({ err: err.message }, 'Failed to schedule daily ledger reconciliation cron job');
  }
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
    startTicketGenerationWorker();
    startLedgerReconciliationWorker();
    scheduleDailyReconciliationJob();
    workerLogger.info('All BullMQ background workers initialized');
  } catch (err) {
    workerLogger.warn({ err }, 'Could not initialize workers (Redis may be in disconnected mode)');
  }
}
