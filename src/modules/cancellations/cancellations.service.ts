import { getPrismaClient } from '../../infrastructure/database';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { addJob } from '../../infrastructure/queues';
import { QueueName } from '../../shared/constants';
import { NotFoundError, ValidationError, ProviderError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { BookingStatus, CancellationStatus, RefundStatus, RefundDestination, TicketStatus, WalletTransactionType } from '@prisma/client';
import { buildRefundLines, buildLedgerPostingData } from '../../infrastructure/ledger';

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

  public async cancelSeats(
    bookingIdentifier: string,
    seatNos: string[],
    reason?: string,
    userId?: string,
    refundToWallet?: boolean
  ) {
    const prisma = getPrismaClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
    const booking = isUuid
      ? await prisma.booking.findUnique({
          where: { id: bookingIdentifier },
          include: { seats: true, payments: true, commissionSnapshot: true, ticket: true },
        })
      : await prisma.booking.findUnique({
          where: { bookingNumber: bookingIdentifier },
          include: { seats: true, payments: true, commissionSnapshot: true, ticket: true },
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

      const refundAmount = Number(cancelRes.RefundAmount ?? 0);
      let commissionReversal = 0;
      let netRefundToAgent = refundAmount;

      if (booking.agentId && booking.commissionSnapshot) {
        const totalBookingFare = Number(booking.totalFare);
        const origCommission = Number(booking.commissionSnapshot.commissionAmt);
        if (totalBookingFare > 0) {
          commissionReversal = Math.round(((refundAmount / totalBookingFare) * origCommission) * 100) / 100;
        }
        netRefundToAgent = Math.max(0, refundAmount - commissionReversal);
      }

      const isAgentBooking = Boolean(booking.agentId);
      const targetUserId = userId ?? booking.userId ?? null;
      // Customer wallet credit: when not an agent booking, user exists, and refundToWallet is requested (or true)
      const creditToCustomerWallet = !isAgentBooking && Boolean(targetUserId) && refundToWallet === true;

      // 3. Atomically update DB records & financials
      const cancellationResult = await prisma.$transaction(async (tx) => {
        // Record cancellation
        const cancellation = await tx.cancellation.create({
          data: {
            bookingId: booking.id,
            userId: targetUserId,
            status: CancellationStatus.COMPLETED,
            seatNos,
            providerNewHoldId: cancelRes.NewHoldId ? String(cancelRes.NewHoldId) : null,
            providerNewTicketNo: cancelRes.NewTicketNo ? String(cancelRes.NewTicketNo) : null,
            providerNewPnrNo: cancelRes.NewPNRNo ? String(cancelRes.NewPNRNo) : null,
            chargePct: Number(cancelRes.ChargePct ?? 0),
            chargeAmt: Number(cancelRes.ChargeAmt ?? cancelRes.CancellationCharge ?? 0),
            refundAmount,
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

        // Update Ticket status to CANCELLED if ticket exists
        if (booking.ticket) {
          await tx.ticket.update({
            where: { id: booking.ticket.id },
            data: { status: TicketStatus.CANCELLED },
          });
        }

        // Credit to customer wallet if requested
        let customerNewWalletBalance: number | null = null;
        if (creditToCustomerWallet && refundAmount > 0 && targetUserId) {
          const updatedUser = await tx.user.update({
            where: { id: targetUserId },
            data: {
              walletBalance: { increment: refundAmount },
            },
            select: { walletBalance: true },
          });
          customerNewWalletBalance = Number(updatedUser.walletBalance);

          await tx.walletTransaction.create({
            data: {
              userId: targetUserId,
              type: WalletTransactionType.REFUND,
              amount: refundAmount,
              balanceAfter: updatedUser.walletBalance,
              referenceType: 'BOOKING_CANCELLATION',
              referenceId: booking.bookingNumber,
              description: `Refund for cancellation of booking #${booking.bookingNumber}`,
            },
          });
        }

        const isWalletDestination = isAgentBooking || creditToCustomerWallet;

        // Create Refund record
        const payment = booking.payments.find((p) => p.status === 'SUCCESS');
        const refund = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentId: payment?.id ?? null,
            cancellationId: cancellation.id,
            userId: targetUserId,
            amount: refundAmount,
            status: isWalletDestination ? RefundStatus.COMPLETED : RefundStatus.PENDING,
            destination: isWalletDestination ? RefundDestination.WALLET : RefundDestination.ORIGINAL_PAYMENT_METHOD,
            reason: reason || 'Seat cancellation processed',
            completedAt: isWalletDestination ? new Date() : null,
          },
        });

        // If agent booking: credit agent wallet and post balanced double-entry ledger reversals
        if (booking.agentId) {
          await tx.agentWallet.update({
            where: { agentId: booking.agentId },
            data: {
              cashBalance: { increment: netRefundToAgent },
              totalRefunds: { increment: refundAmount },
              version: { increment: 1 },
            },
          });

          const idempotencyPrefix = `CANCEL-${cancellation.id}-${Date.now()}`;
          const ledgerLines = buildRefundLines({
            bookingId: booking.id,
            cancellationId: cancellation.id,
            agentId: booking.agentId,
            refundAmount,
            commissionReversal,
            idempotencyPrefix,
          });

          const ledgerData = buildLedgerPostingData({
            agentId: booking.agentId,
            bookingId: booking.id,
            cancellationId: cancellation.id,
            referenceId: booking.bookingNumber,
            createdBy: userId || 'SYSTEM',
            lines: ledgerLines,
          });

          await tx.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });

          if (booking.commissionSnapshot && commissionReversal > 0) {
            await tx.commissionSnapshot.update({
              where: { id: booking.commissionSnapshot.id },
              data: {
                reversedAt: new Date(),
                reversalAmt: commissionReversal,
              },
            });
          }
        }

        return {
          cancellation,
          refund,
          providerResponse: cancelRes,
          commissionReversal,
          netRefundToAgent: isAgentBooking ? netRefundToAgent : undefined,
          walletCredited: isWalletDestination,
          newWalletBalance: customerNewWalletBalance,
        };
      });

      // 4. Enqueue gateway refund processing job only for customer credit-card/UPI payments if not credited to wallet
      if (!isAgentBooking && !creditToCustomerWallet && refundAmount > 0) {
        try {
          await addJob(QueueName.REFUND_PROCESSING, 'process-refund', {
            refundId: cancellationResult.refund.id,
            bookingId: booking.id,
            amount: refundAmount,
          });
        } catch (queueErr) {
          this.cancelLogger.warn({ queueErr }, 'Failed to queue refund processing job');
        }
      }

      this.cancelLogger.info(
        { bookingId: booking.id, refundAmount, isAgentBooking, creditToCustomerWallet },
        'Cancellation completed and financials settled'
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
