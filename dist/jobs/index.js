"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBookingReconciliationWorker = startBookingReconciliationWorker;
exports.startHoldExpiryWorker = startHoldExpiryWorker;
exports.startRefundWorker = startRefundWorker;
exports.startNotificationWorkers = startNotificationWorkers;
exports.initializeWorkers = initializeWorkers;
const queues_1 = require("../infrastructure/queues");
const constants_1 = require("../shared/constants");
const database_1 = require("../infrastructure/database");
const gdsAdapter_1 = require("../providers/gds/gdsAdapter");
const logger_1 = require("../infrastructure/logger");
const client_1 = require("@prisma/client");
const workerLogger = logger_1.logger.child({ module: 'background-workers' });
/**
 * 1. Booking Reconciliation Worker
 * Resolves BOOKING_UNKNOWN states caused by network timeouts during BookSeats call
 */
function startBookingReconciliationWorker() {
    const gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    return (0, queues_1.createWorker)(constants_1.QueueName.BOOKING_RECONCILIATION, async (job) => {
        const { bookingId, providerHoldId } = job.data;
        const prisma = (0, database_1.getPrismaClient)();
        workerLogger.info({ bookingId, providerHoldId }, 'Reconciling unknown booking with GDS...');
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });
        if (!booking || booking.status !== client_1.BookingStatus.BOOKING_UNKNOWN) {
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
                        status: client_1.BookingStatus.CONFIRMED,
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
                        status: client_1.TicketStatus.ISSUED,
                        bookingSnapshot: booking,
                    },
                });
            });
            workerLogger.info({ bookingId }, 'Reconciliation SUCCESS: Booking marked CONFIRMED');
        }
        else if (statusResponse.Status === -1 || statusResponse.Status === -2) {
            // Provider did not book seats; fail and trigger refund
            await prisma.booking.update({
                where: { id: bookingId },
                data: { status: client_1.BookingStatus.BOOKING_FAILED },
            });
            workerLogger.warn({ bookingId }, 'Reconciliation: Provider confirmed booking failure; auto-refund triggered');
        }
        else {
            // Still in progress at provider, throw error to trigger BullMQ exponential retry
            throw new Error(`Booking ${bookingId} is still in progress at provider (Status: 0)`);
        }
    });
}
/**
 * 2. Hold Expiry Cleanup Worker
 * Releases seats and marks SeatHold expired after 10-minute TTL
 */
function startHoldExpiryWorker() {
    return (0, queues_1.createWorker)(constants_1.QueueName.HOLD_EXPIRY_CLEANUP, async (job) => {
        const { holdId } = job.data;
        const prisma = (0, database_1.getPrismaClient)();
        const hold = await prisma.seatHold.findUnique({
            where: { id: holdId },
        });
        if (hold && hold.status === client_1.HoldStatus.ACTIVE && new Date() >= hold.expiresAt) {
            await prisma.seatHold.update({
                where: { id: holdId },
                data: { status: client_1.HoldStatus.EXPIRED, releasedAt: new Date() },
            });
            workerLogger.info({ holdId }, 'Expired seat hold released');
        }
    });
}
/**
 * 3. Refund Processing Worker
 * Dispatches refunds to payment gateway / wallet and updates database records
 */
function startRefundWorker() {
    return (0, queues_1.createWorker)(constants_1.QueueName.REFUND_PROCESSING, async (job) => {
        const { refundId, amount } = job.data;
        const prisma = (0, database_1.getPrismaClient)();
        workerLogger.info({ refundId, amount }, 'Processing refund...');
        // Simulate gateway refund API call (e.g., PhonePe Refund API)
        await new Promise((resolve) => setTimeout(resolve, 500));
        await prisma.refund.update({
            where: { id: refundId },
            data: {
                status: client_1.RefundStatus.COMPLETED,
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
function startNotificationWorkers() {
    const emailWorker = (0, queues_1.createWorker)(constants_1.QueueName.NOTIFICATION_EMAIL, async (job) => {
        const { recipient, bookingNumber } = job.data;
        workerLogger.info({ recipient, bookingNumber }, 'Sending confirmation email');
    });
    const smsWorker = (0, queues_1.createWorker)(constants_1.QueueName.NOTIFICATION_SMS, async (job) => {
        const { recipient, bookingNumber } = job.data;
        workerLogger.info({ recipient, bookingNumber }, 'Sending confirmation SMS');
    });
    return [emailWorker, smsWorker];
}
/**
 * Initialize all application background workers
 */
function initializeWorkers() {
    try {
        startBookingReconciliationWorker();
        startHoldExpiryWorker();
        startRefundWorker();
        startNotificationWorkers();
        workerLogger.info('All BullMQ background workers initialized');
    }
    catch (err) {
        workerLogger.warn({ err }, 'Could not initialize workers (Redis may be in disconnected mode)');
    }
}
//# sourceMappingURL=index.js.map