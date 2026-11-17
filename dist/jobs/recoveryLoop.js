"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverTransactions = recoverTransactions;
exports.startRecoveryLoop = startRecoveryLoop;
const expireCheckout_1 = require("../modules/bookings/expireCheckout");
const tickets_service_1 = require("../modules/tickets/tickets.service");
const database_1 = require("../infrastructure/database");
const logger_1 = require("../infrastructure/logger");
const payments_service_1 = require("../modules/payments/payments.service");
const cancellations_service_1 = require("../modules/cancellations/cancellations.service");
const index_1 = require("./index");
// Database rows are durable work records. This bounded scanner also works without Redis.
async function recoverTransactions() {
    const db = (0, database_1.getPrismaClient)();
    const cutoff = new Date(Date.now() - 120000);
    const [payments, bookings, refunds, expired, cancellations, tickets] = await Promise.all([
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
        ...tickets.map((ticket) => () => tickets_service_1.TicketsService.getInstance().refreshProviderDetails(ticket.id)),
        ...expired.map((hold) => async () => {
            if (hold.bookingId)
                await (0, expireCheckout_1.expireUnpaidCheckout)(hold.bookingId);
        }),
        ...payments.map((p) => async () => {
            const claimed = await db.payment.updateMany({ where: { id: p.id, nextCheckAt: p.nextCheckAt, status: { in: ['PENDING', 'PROCESSING', 'FAILED', 'TIMED_OUT'] } }, data: { nextCheckAt: new Date(Date.now() + Math.min(21600000, 30000 * 2 ** Math.min(p.attempts, 10))), attempts: { increment: 1 } } });
            if (!claimed.count)
                return;
            try {
                await payments_service_1.PaymentsService.getInstance().verifyPayment({ bookingId: p.bookingId, merchantTxnId: p.merchantTxnId }, undefined, true);
            }
            finally {
                await db.payment.updateMany({
                    where: { id: p.id, status: { in: ["PENDING", "PROCESSING"] } },
                    data: { updatedAt: new Date() },
                });
            }
        }),
        ...bookings.map((b) => async () => {
            try {
                if (b.providerHoldId)
                    await (0, index_1.reconcileBooking)({
                        bookingId: b.id,
                        providerHoldId: b.providerHoldId,
                    });
            }
            finally {
                await db.booking.updateMany({
                    where: { id: b.id, status: { in: ["PAYMENT_SUCCESS", "BOOKING_REQUESTED", "BOOKING_UNKNOWN"] } },
                    data: { updatedAt: new Date() },
                });
            }
        }),
        ...refunds.map((r) => () => (0, index_1.processRefund)({ refundId: r.id })),
        ...cancellations.map((c) => async () => {
            if (c.providerResponse)
                await cancellations_service_1.CancellationsService.getInstance().settle(c.id);
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
                logger_1.logger.error({ cancellationId: c.id, bookingId: c.bookingId }, "Operator cancellation confirmation requires review");
            }
        }),
    ];
    let index = 0;
    await Promise.all([0, 1, 2].map(async () => {
        while (index < tasks.length) {
            const task = tasks[index++];
            try {
                await task();
            }
            catch (err) {
                logger_1.logger.warn({ err }, "Transaction recovery will retry");
            }
        }
    }));
}
function startRecoveryLoop() {
    let running = false;
    let stopped = false;
    const tick = async () => {
        if (running || stopped)
            return;
        running = true;
        try {
            await recoverTransactions();
        }
        catch (err) {
            logger_1.logger.error({ err }, "Transaction recovery scan failed");
        }
        finally {
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
//# sourceMappingURL=recoveryLoop.js.map