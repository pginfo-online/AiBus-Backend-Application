import { createHash } from "node:crypto";
import { getPrismaClient } from "../../infrastructure/database";
import { GdsAdapter } from "../../providers/gds/gdsAdapter";
import { addJob } from "../../infrastructure/queues";
import { QueueName } from "../../shared/constants";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../../shared/errors";
import { logger } from "../../infrastructure/logger";
import { cancellationRefund, splitRefund } from "./refundMath";
import {
  buildRefundLines,
  buildLedgerPostingData,
} from "../../infrastructure/ledger";

export class CancellationsService {
  private static instance: CancellationsService;
  static getInstance() {
    return (this.instance ??= new CancellationsService());
  }
  private provider = GdsAdapter.getInstance();
  private async owned(identifier: string, userId?: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(identifier);
    const booking = await getPrismaClient().booking.findFirst({
      where: isUuid ? { id: identifier } : { bookingNumber: identifier },
      include: {
        seats: true,
        payments: true,
        ticket: true,
        cancellations: true,
        refunds: true,
        commissionSnapshot: true,
      },
    });
    if (!booking) {
      throw new NotFoundError("Booking");
    }
    // If the booking is tied to an account and a user ID is passed, enforce ownership
    if (booking.userId && userId && booking.userId !== userId) {
      throw new NotFoundError("Booking");
    }
    // If booking was created without an account (guest booking) and a user is now logged in,
    // link it to this user
    if (!booking.userId && userId) {
      await getPrismaClient()
        .booking.update({
          where: { id: booking.id },
          data: { userId },
        })
        .catch(() => {});
      booking.userId = userId;
    }
    return booking;
  }
  private selected(
    booking: Awaited<ReturnType<CancellationsService["owned"]>>,
    requested?: string[],
  ) {
    const active = booking.seats
      .filter((s) => !s.cancelledAt)
      .map((s) => s.seatNo);
    const selected = requested?.length
      ? requested.map((s) => s.trim()).sort()
      : active.sort();
    if (
      !selected.length ||
      new Set(selected).size !== selected.length ||
      selected.some((s) => !active.includes(s))
    )
      throw new ValidationError(
        "Select active seats belonging to this booking",
      );
    return selected;
  }
  async checkCancellability(
    identifier: string,
    seats?: string[],
    userId?: string,
  ) {
    const booking = await this.owned(identifier, userId);
    const ticketNo = booking.providerTicketNo || booking.ticket?.ticketNumber;
    const pnrNo = booking.providerPnrNo || booking.ticket?.pnrNumber;

    if (
      booking.status !== "CONFIRMED" ||
      !ticketNo ||
      !pnrNo
    )
      throw new ValidationError(
        "This booking is not eligible for cancellation",
      );
    const selected = this.selected(booking, seats);
    const quote = await this.provider.isCancellable(
      ticketNo,
      selected.join(","),
      pnrNo,
    );
    const grossTotal = booking.seats.reduce(
      (sum, s) => sum + Number(s.fareTotal),
      0,
    );
    const selectedGross = booking.seats
      .filter((s) => selected.includes(s.seatNo))
      .reduce((sum, s) => sum + Number(s.fareTotal), 0);
    const refundAmount = cancellationRefund({
      grossTotal,
      selectedGross,
      paidTotal: Number(booking.totalFare),
      operatorRefund: quote.RefundAmount,
      refunded: booking.refunds.filter((r) => r.cancellationId).reduce((sum, r) => sum + Number(r.amount), 0),
    });
    return {
      ...quote,
      RefundAmount: refundAmount,
      CancellationCharge: quote.ChargeAmt ?? quote.CancellationCharge,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      seatNos: selected.join(","),
      ticketNo,
      pnrNo,
    };
  }
  async cancelSeats(
    identifier: string,
    seats: string[],
    reason?: string,
    userId?: string,
    refundToWallet = false,
  ) {
    const prisma = getPrismaClient();
    const booking = await this.owned(identifier, userId);
    // A retry during uncertain cancellation reads the saved operation; it never reissues CancelSeats.
    const outstanding = booking.cancellations.find(
      (c) => c.status === "REQUESTED",
    );
    if (outstanding) return this.result(outstanding.id);
    const previous = booking.cancellations.find(
      (c) =>
        c.status === "COMPLETED" &&
        seats.length &&
        c.seatNos.length === seats.length &&
        seats.every((s) => c.seatNos.includes(s)),
    );
    if (previous) return this.result(previous.id);

    const ticketNo = booking.providerTicketNo || booking.ticket?.ticketNumber;
    const pnrNo = booking.providerPnrNo || booking.ticket?.pnrNumber;

    if (
      booking.status !== "CONFIRMED" ||
      !ticketNo ||
      !pnrNo
    )
      throw new ValidationError(
        "This booking is not eligible for cancellation",
      );
    const selected = this.selected(booking, seats);
    const quote = await this.provider.isCancellable(
      ticketNo,
      selected.join(","),
      pnrNo,
    );
    if (!quote.IsCancellable)
      throw new ValidationError(quote.Message || "The operator declined cancellation");
    const key = createHash("sha256")
      .update(`${booking.id}:${ticketNo}:${selected.join(",")}`)
      .digest("hex");
    const operation = await prisma.$transaction(async (tx) => {
      const claimed = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: "CONFIRMED",
          version: booking.version,
        },
        data: { status: "CANCELLATION_REQUESTED", version: { increment: 1 } },
      });
      if (!claimed.count)
        throw new ConflictError(
          "Cancellation is already in progress. Refresh booking status.",
        );
      return tx.cancellation.create({
        data: {
          bookingId: booking.id,
          userId,
          status: "REQUESTED",
          seatNos: selected,
          reason,
          refundToWallet,
          idempotencyKey: key,
          chargePct: quote.ChargePct ?? 0,
          chargeAmt: quote.ChargeAmt ?? 0,
          refundAmount: 0,
          totalFare: Number(booking.totalFare),
          requestSnapshot: {
            ticketNo,
            pnrNo,
            quote: JSON.parse(JSON.stringify(quote)),
          },
        },
      });
    });
    try {
      const response = await this.provider.cancelSeats({
        TicketNo: ticketNo,
        PNR: pnrNo,
        SeatNos: selected.join(","),
      });
      await prisma.cancellation.update({
        where: { id: operation.id },
        data: { providerResponse: response as any },
      });
      await this.settle(operation.id);
    } catch (error) {
      logger.error(
        {
          cancellationId: operation.id,
          bookingId: booking.id,
          err: error instanceof Error ? error.message : "unknown",
        },
        "Cancellation outcome requires reconciliation; no duplicate provider request will be made",
      );
      await prisma.cancellation.updateMany({
        where: { id: operation.id, status: "REQUESTED" },
        data: { lastError: "OPERATOR_CONFIRMATION_PENDING" },
      });
    }
    return this.result(operation.id);
  }
  async result(id: string) {
    const cancellation = await getPrismaClient().cancellation.findUniqueOrThrow(
      { where: { id }, include: { refunds: true } },
    );
    return {
      cancellation,
      refund: cancellation.refunds[0] ?? null,
      refunds: cancellation.refunds,
      walletCredited: cancellation.refunds.some(
        (r) => r.destination === "WALLET" && r.status === "COMPLETED",
      ),
    };
  }
  async settle(id: string) {
    const prisma = getPrismaClient();
    const pending = await prisma.cancellation.findUniqueOrThrow({
      where: { id },
    });
    if (pending.status !== "REQUESTED" || !pending.providerResponse) return;
    const response =
      pending.providerResponse as unknown as import("../../providers/types").GdsCancelResponse;
    if (
      response.Status !== 1 ||
      !Number.isFinite(response.RefundAmount) ||
      response.RefundAmount < 0
    )
      throw new ValidationError("Operator cancellation response is invalid");
    const refunds = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${pending.bookingId}::uuid FOR UPDATE`;
      const current = await tx.cancellation.findUniqueOrThrow({
        where: { id },
      });
      if (current.status !== "REQUESTED") return [];
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: pending.bookingId },
        include: {
          seats: true,
          payments: true,
          refunds: true,
          ticket: true,
          commissionSnapshot: true,
        },
      });
      const remaining = booking.seats.filter(
        (s) => !s.cancelledAt && !pending.seatNos.includes(s.seatNo),
      );
      if (remaining.length && (!response.NewTicketNo || !response.NewPNRNo))
        throw new ValidationError(
          "Replacement ticket identifiers are required for partial cancellation",
        );
      const grossTotal = booking.seats.reduce(
        (sum, s) => sum + Number(s.fareTotal),
        0,
      );
      const selectedGross = booking.seats
        .filter((s) => pending.seatNos.includes(s.seatNo))
        .reduce((sum, s) => sum + Number(s.fareTotal), 0);
      const previousRefunds = booking.refunds.filter(
        (r) => Boolean(r.cancellationId) && r.status !== "REVERSED",
      );
      const refundAmount = cancellationRefund({
        grossTotal,
        selectedGross,
        paidTotal: Number(booking.totalFare),
        operatorRefund: response.RefundAmount,
        refunded: previousRefunds.reduce((sum, r) => sum + Number(r.amount), 0),
      });
      await tx.cancellation.update({
        where: { id },
        data: {
          status: "COMPLETED",
          refundAmount,
          chargeAmt: response.ChargeAmt ?? response.CancellationCharge,
          chargePct: response.ChargePct ?? 0,
          providerNewHoldId: response.NewHoldId
            ? String(response.NewHoldId)
            : null,
          providerNewTicketNo: response.NewTicketNo,
          providerNewPnrNo: response.NewPNRNo,
          lastError: null,
        },
      });
      await tx.bookingSeat.updateMany({
        where: {
          bookingId: booking.id,
          seatNo: { in: pending.seatNos },
          cancelledAt: null,
        },
        data: { cancelledAt: new Date() },
      });
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: remaining.length ? "CONFIRMED" : "CANCELLED",
          cancelledAt: remaining.length ? null : new Date(),
          version: { increment: 1 },
          ...(remaining.length
            ? {
                providerTicketNo: response.NewTicketNo,
                providerPnrNo: response.NewPNRNo,
                providerHoldId: response.NewHoldId
                  ? String(response.NewHoldId)
                  : booking.providerHoldId,
              }
            : {}),
        },
      });
      if (booking.ticket)
        await tx.ticket.update({
          where: { bookingId: booking.id },
          data: remaining.length
            ? {
                ticketNumber: response.NewTicketNo,
                pnrNumber: response.NewPNRNo,
                status: "ISSUED",
              }
            : { status: "CANCELLED" },
        });
      const payment = (booking.paidPaymentId ? booking.payments.find((p) => p.id === booking.paidPaymentId) : undefined)
        || booking.payments.find((p) => ['SUCCESS','PARTIALLY_REFUNDED'].includes(p.status));
      if (!payment) throw new ValidationError("Settled payment is missing");
      const priorRefunded = previousRefunds.reduce(
        (sum, r) => sum + Number(r.amount),
        0,
      );
      const walletFunded = Number(booking.walletAmount);
      let walletRemaining = Math.max(0, walletFunded - priorRefunded);
      let gatewayRemaining = Math.max(
        0,
        Number(payment.amount) - Math.max(0, priorRefunded - walletFunded),
      );
      let amount = refundAmount;
      if (booking.agentId && payment.gateway === "WALLET") {
        const commission = Number(
          booking.commissionSnapshot?.commissionAmt ?? 0,
        );
        const reversed = Math.max(0, Math.min(
          commission - Number(booking.commissionSnapshot?.reversalAmt ?? 0),
          Math.round(((commission * refundAmount) / grossTotal) * 100) / 100,
        ));
        amount = Math.max(0, Math.min(refundAmount - reversed, Number(payment.amount) - priorRefunded));
        await tx.$queryRaw`SELECT id FROM agent_wallets WHERE agent_id = ${booking.agentId}::uuid FOR UPDATE`;
        const agentWallet = await tx.agentWallet.findUniqueOrThrow({ where: { agentId: booking.agentId } });
        const metadata = payment.metadata as { creditDebited?: number } | null;
        const creditRepayment = Math.max(0, Math.min(amount, Number(agentWallet.creditUsed), (metadata?.creditDebited ?? 0) - priorRefunded));
        await tx.agentWallet.update({
          where: { agentId: booking.agentId },
          data: {
            cashBalance: { increment: amount - creditRepayment },
            creditUsed: { decrement: creditRepayment },
            totalRefunds: { increment: amount },
            version: { increment: 1 },
          },
        });
        const lines = buildRefundLines({
          bookingId: booking.id,
          cancellationId: id,
          agentId: booking.agentId,
          refundAmount: amount + reversed,
          commissionReversal: reversed,
          idempotencyPrefix: `CANCEL-${id}`,
        });
        await tx.ledgerEntry.createMany({
          data: buildLedgerPostingData({
            agentId: booking.agentId,
            bookingId: booking.id,
            cancellationId: id,
            lines,
          }),
          skipDuplicates: true,
        });
        if (booking.commissionSnapshot)
          await tx.commissionSnapshot.update({
            where: { bookingId: booking.id },
            data: {
              reversedAt: new Date(),
              reversalAmt: { increment: reversed },
            },
          });
        walletRemaining = amount;
        gatewayRemaining = 0;
      }
      const split = splitRefund(amount, walletRemaining, gatewayRemaining);
      const created = [];
      for (const [funding, value] of [
        ["WALLET", split.wallet],
        ["GATEWAY", split.gateway],
      ] as const) {
        const source =
          funding === "WALLET" || pending.refundToWallet
            ? "WALLET"
            : "ORIGINAL_PAYMENT_METHOD";
        const paymentId =
          funding === "WALLET" && payment.gateway !== "WALLET"
            ? null
            : payment.id;
        if (value <= 0) continue;
        if (source === "WALLET" && booking.userId && !booking.agentId) {
          const user = await tx.user.update({
            where: { id: booking.userId },
            data: { walletBalance: { increment: value } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: booking.userId,
              type: "REFUND",
              amount: value,
              balanceAfter: user.walletBalance,
              referenceType: "CANCELLATION",
              referenceId: id,
              description: `Cancellation refund for ${booking.bookingNumber}`,
            },
          });
        }
        created.push(
          await tx.refund.create({
            data: {
              bookingId: booking.id,
              paymentId,
              cancellationId: id,
              userId: booking.userId,
              amount: value,
              destination: source,
              status: source === "WALLET" ? "COMPLETED" : "PENDING",
              completedAt: source === "WALLET" ? new Date() : null,
              idempotencyKey: `cancellation-${id}-${funding}`,
              reason: pending.reason || "Seat cancellation",
            },
          }),
        );
      }
      const completed = await tx.refund.aggregate({
        where: { paymentId: payment.id, status: "COMPLETED" },
        _sum: { amount: true },
      });
      if (Number(completed._sum.amount ?? 0) > 0)
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status:
              Number(completed._sum.amount) >= Number(payment.amount)
                ? "REFUNDED"
                : "PARTIALLY_REFUNDED",
          },
        });
      return created;
    });
    for (const refund of refunds)
      if (refund.status !== "COMPLETED")
        await addJob(
          QueueName.REFUND_PROCESSING,
          "process-refund",
          { refundId: refund.id },
          {
            jobId: `refund-${refund.id}`,
            attempts: 8,
            backoff: { type: "exponential", delay: 30000 },
          },
        );
  }
}
