import { expireUnpaidCheckout } from "../modules/bookings/expireCheckout";
import { TicketsService } from "../modules/tickets/tickets.service";
import { getPrismaClient } from "../infrastructure/database";
import { logger } from "../infrastructure/logger";
import { PaymentsService } from "../modules/payments/payments.service";
import { CancellationsService } from "../modules/cancellations/cancellations.service";
import { processRefund, reconcileBooking } from "./index";

// Database rows are durable work records. This bounded scanner also works without Redis.
export async function recoverTransactions() {
  const db = getPrismaClient();
  const cutoff = new Date(Date.now() - 120000);
  const [payments, bookings, refunds, expired, cancellations, tickets] =
    await Promise.all([
      db.payment.findMany({
        where: {
          gateway: "RAZORPAY",
          status: { in: ["PENDING", "PROCESSING", "FAILED", "TIMED_OUT"] },
          nextCheckAt: { lt: new Date() },
          createdAt: { gt: new Date(Date.now() - 86400000) },
          updatedAt: { lt: cutoff },
        },
        orderBy: { updatedAt: "asc" },
        take: 20,
      }),
      db.booking.findMany({
        where: {
          status: {
            in: ["PAYMENT_SUCCESS", "BOOKING_REQUESTED", "BOOKING_UNKNOWN"],
          },
          updatedAt: { lt: cutoff },
        },
        orderBy: { updatedAt: "asc" },
        take: 20,
      }),
      db.refund.findMany({
        where: {
          destination: "ORIGINAL_PAYMENT_METHOD",
          status: { in: ["PENDING", "PROCESSING", "FAILED"] },
          updatedAt: { lt: cutoff },
        },
        orderBy: { updatedAt: "asc" },
        take: 20,
      }),
      db.seatHold.findMany({
        where: {
          status: { in: ["ACTIVE", "EXPIRED"] },
          expiresAt: { lt: new Date(Date.now() - 90000) },
          booking: {
            status: { in: ["HELD", "PAYMENT_PENDING", "PAYMENT_FAILED"] },
          },
        },
        select: { bookingId: true },
        orderBy: { expiresAt: "asc" },
        take: 20,
      }),
      db.cancellation.findMany({
        where: { status: "REQUESTED", updatedAt: { lt: cutoff } },
        orderBy: { updatedAt: "asc" },
        take: 20,
      }),
      db.booking.findMany({
        where: { status: "CONFIRMED", ticketEnrichedAt: null },
        orderBy: { updatedAt: "asc" },
        take: 10,
        select: { id: true },
      }),
    ]);
  const tasks = [
    ...tickets.map(
      (ticket) => () =>
        TicketsService.getInstance().refreshProviderDetails(ticket.id),
    ),
    ...expired.map((hold) => async () => {
      if (hold.bookingId) await expireUnpaidCheckout(hold.bookingId);
    }),
    ...payments.map((p) => async () => {
      const claimed = await db.payment.updateMany({ where: { id: p.id, nextCheckAt: p.nextCheckAt, status: { in: ['PENDING','PROCESSING','FAILED','TIMED_OUT'] } }, data: { nextCheckAt: new Date(Date.now() + Math.min(21600000, 30000 * 2 ** Math.min(p.attempts, 10))), attempts: { increment: 1 } } });
      if (!claimed.count) return;
      try {
        await PaymentsService.getInstance().verifyPayment(
          { bookingId: p.bookingId, merchantTxnId: p.merchantTxnId },
          undefined,
          true,
        );
      } finally {
        await db.payment.updateMany({
          where: { id: p.id, status: { in: ["PENDING", "PROCESSING"] } },
          data: { updatedAt: new Date() },
        });
      }
    }),
    ...bookings.map((b) => async () => {
      try {
        if (b.providerHoldId)
          await reconcileBooking({
            bookingId: b.id,
            providerHoldId: b.providerHoldId,
          });
      } finally {
        await db.booking.updateMany({
          where: { id: b.id, status: { in: ["PAYMENT_SUCCESS", "BOOKING_REQUESTED", "BOOKING_UNKNOWN"] } },
          data: { updatedAt: new Date() },
        });
      }
    }),
    ...refunds.map((r) => () => processRefund({ refundId: r.id })),
    ...cancellations.map((c) => async () => {
      if (c.providerResponse)
        await CancellationsService.getInstance().settle(c.id);
      else {
        // The provider has no cancellation-status endpoint in its supplied contract.
        // A timed-out write must be reviewed, never blindly repeated or refunded from an estimate.
        await db.cancellation.updateMany({
          where: { id: c.id, status: "REQUESTED" },
          data: {
            lastError: "OPERATOR_REVIEW_REQUIRED",
            updatedAt: new Date(),
          },
        });
        logger.error(
          { cancellationId: c.id, bookingId: c.bookingId },
          "Operator cancellation confirmation requires review",
        );
      }
    }),
  ];
  let index = 0;
  await Promise.all(
    [0, 1, 2].map(async () => {
      while (index < tasks.length) {
        const task = tasks[index++];
        try {
          await task();
        } catch (err) {
          logger.warn({ err }, "Transaction recovery will retry");
        }
      }
    }),
  );
}

export function startRecoveryLoop() {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await recoverTransactions();
    } catch (err) {
      logger.error({ err }, "Transaction recovery scan failed");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, 30000);
  timer.unref();
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
