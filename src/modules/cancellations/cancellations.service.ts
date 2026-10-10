import { getPrismaClient } from '../../infrastructure/database';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { addJob } from '../../infrastructure/queues';
import { QueueName } from '../../shared/constants';
import { NotFoundError, ValidationError, ProviderError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { BookingStatus, CancellationStatus, RefundStatus, RefundDestination } from '@prisma/client';

export class CancellationsService {
  private static instance: CancellationsService;
  private gdsAdapter: GdsAdapter;
  private cancelLogger = logger.child({ module: 'cancellations-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): CancellationsService {
    if (!CancellationsService.instance) {
      CancellationsService.instance = new CancellationsService();
    }
    return CancellationsService.instance;
  }

  public async checkCancellability(bookingIdentifier: string, seatNos?: string[]) {
    const prisma = getPrismaClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
    const booking = isUuid
      ? await prisma.booking.findUnique({
          where: { id: bookingIdentifier },
          include: { seats: true },
        })
      : await prisma.booking.findUnique({
          where: { bookingNumber: bookingIdentifier },
          include: { seats: true },
        });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ValidationError(`Cannot check cancellation: Booking status is ${booking.status}`);
    }

    if (!booking.providerTicketNo) {
      throw new ValidationError('Booking does not have an active ticket number');
    }

    const seatsToCancel = seatNos && seatNos.length > 0 ? seatNos.join(',') : booking.seats.map((s) => s.seatNo).join(',');

    const cancellableInfo = await this.gdsAdapter.isCancellable(
      booking.providerTicketNo,
      seatsToCancel,
      booking.providerPnrNo || undefined
    );

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      ticketNo: booking.providerTicketNo,
      pnrNo: booking.providerPnrNo,
      seatNos: seatsToCancel,
      ...cancellableInfo,
    };
  }

  public async checkCancellabilityDirect(params: { ticketNo: string; seatNos: string; pnrNo?: string }) {
    return this.gdsAdapter.isCancellable(params.ticketNo, params.seatNos, params.pnrNo);
  }

  public async cancelSeatsDirect(params: { TicketNo: string; SeatNos: string; PNR?: string }) {
    return this.gdsAdapter.cancelSeats({
      TicketNo: params.TicketNo,
      SeatNos: params.SeatNos,
      PNR: params.PNR,
    });
  }

  public async cancelSeats(bookingIdentifier: string, seatNos: string[], reason?: string, userId?: string) {
    const prisma = getPrismaClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
    const booking = isUuid
      ? await prisma.booking.findUnique({
          where: { id: bookingIdentifier },
          include: { seats: true, payments: true },
        })
      : await prisma.booking.findUnique({
          where: { bookingNumber: bookingIdentifier },
          include: { seats: true, payments: true },
        });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new ValidationError(`Cannot cancel booking in status ${booking.status}`);
    }

    if (!booking.providerTicketNo) {
      throw new ValidationError('No active ticket number found for this booking');
    }

    const seatString = seatNos.join(',');

    // 1. Transition booking to CANCELLATION_REQUESTED
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.CANCELLATION_REQUESTED },
    });

    try {
      // 2. Call upstream GDS provider CancelSeats
      const cancelRes = await this.gdsAdapter.cancelSeats({
        TicketNo: booking.providerTicketNo,
        PNR: booking.providerPnrNo || undefined,
        SeatNos: seatString,
      });

      // Status 1 = success; any other value (0, -1, -2, etc.) = failure
      if (cancelRes.Status !== 1) {
        throw new ProviderError('GDS', cancelRes.Message || 'Failed to cancel seats with provider');
      }

      // 3. Atomically update DB records
      const cancellationResult = await prisma.$transaction(async (tx) => {
        // Record cancellation
        const cancellation = await tx.cancellation.create({
          data: {
            bookingId: booking.id,
            userId: userId ?? booking.userId ?? null,
            status: CancellationStatus.COMPLETED,
            seatNos,
            providerNewHoldId: cancelRes.NewHoldId ? String(cancelRes.NewHoldId) : null,
            providerNewTicketNo: cancelRes.NewTicketNo ? String(cancelRes.NewTicketNo) : null,
            providerNewPnrNo: cancelRes.NewPNRNo ? String(cancelRes.NewPNRNo) : null,
            chargePct: Number(cancelRes.ChargePct ?? 0),
            chargeAmt: Number(cancelRes.ChargeAmt ?? cancelRes.CancellationCharge ?? 0),
            refundAmount: Number(cancelRes.RefundAmount ?? 0),
            totalFare: Number(cancelRes.TotalFare || booking.totalFare),
            reason,
          },
        });

        // Update booking status
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

        // Create Refund record
        const payment = booking.payments.find((p) => p.status === 'SUCCESS');
        const refund = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: payment?.id ?? null,
            cancellationId: cancellation.id,
            userId: userId ?? booking.userId ?? null,
            amount: Number(cancelRes.RefundAmount ?? 0),
            status: RefundStatus.PENDING,
            destination: RefundDestination.ORIGINAL_PAYMENT_METHOD,
            reason: reason || 'Customer requested seat cancellation',
          },
        });

        return { cancellation, refund, providerResponse: cancelRes };
      });

      // 4. Enqueue refund processing job
      try {
        await addJob(QueueName.REFUND_PROCESSING, 'process-refund', {
          refundId: cancellationResult.refund.id,
          bookingId: booking.id,
          amount: Number(cancelRes.RefundAmount ?? 0),
        });
      } catch (queueErr) {
        this.cancelLogger.warn({ queueErr }, 'Failed to queue refund processing job');
      }

      this.cancelLogger.info(
        { bookingId: booking.id, refundAmount: cancelRes.RefundAmount },
        'Cancellation successful and refund queued'
      );

      return cancellationResult;
    } catch (err: any) {
      // Revert booking to CONFIRMED on provider cancellation rejection
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CONFIRMED },
      });
      throw err;
    }
  }
}
