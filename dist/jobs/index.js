"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBookingReconciliationWorker = startBookingReconciliationWorker;
exports.startHoldExpiryWorker = startHoldExpiryWorker;
exports.startRefundWorker = startRefundWorker;
exports.startNotificationWorkers = startNotificationWorkers;
exports.initializeWorkers = initializeWorkers;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const queues_1 = require("../infrastructure/queues");
const constants_1 = require("../shared/constants");
const database_1 = require("../infrastructure/database");
const gdsAdapter_1 = require("../providers/gds/gdsAdapter");
const logger_1 = require("../infrastructure/logger");
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const workerLogger = logger_1.logger.child({ module: 'background-workers' });
// ---------------------------------------------------------------------------
// PhonePe Refund API Helper
// ---------------------------------------------------------------------------
const PHONEPE_API_BASE = env_1.env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
async function callPhonePeRefund(params) {
    const merchantId = env_1.env.PHONEPE_MERCHANT_ID;
    const saltKey = env_1.env.PHONEPE_CLIENT_SECRET;
    const saltIndex = env_1.env.PHONEPE_CLIENT_VERSION || '1';
    const payload = {
        merchantId,
        merchantUserId: 'AIBUS_SYSTEM',
        originalTransactionId: params.originalMerchantTxnId,
        merchantTransactionId: params.merchantRefundId,
        amount: Math.round(params.amount * 100), // Convert to paise
        callbackUrl: env_1.env.PHONEPE_CALLBACK_URL || '',
    };
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const endpoint = '/v3/credit/backToSource';
    const hash = crypto_1.default
        .createHash('sha256')
        .update(base64Payload + endpoint + saltKey)
        .digest('hex');
    const xVerify = `${hash}###${saltIndex}`;
    try {
        const response = await axios_1.default.post(`${PHONEPE_API_BASE}${endpoint}`, { request: base64Payload }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': merchantId,
            },
            timeout: 15000,
        });
        const data = response.data;
        workerLogger.info({ merchantRefundId: params.merchantRefundId, code: data?.code }, 'PhonePe refund API response');
        return {
            success: data?.success === true || data?.code === 'REFUND_SUCCESS',
            refundId: data?.data?.transactionId,
            code: data?.code || 'UNKNOWN',
        };
    }
    catch (err) {
        workerLogger.error({ err: err.message, status: err.response?.status, merchantRefundId: params.merchantRefundId }, 'PhonePe refund API call failed');
        // Don't throw — let the worker mark the refund as FAILED and retry
        return { success: false, code: err.response?.data?.code || 'API_ERROR' };
    }
}
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
            // Booking was confirmed at provider! Atomically update booking + create ticket
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
                // Create Ticket record idempotently
                const existingTicket = await tx.ticket.findUnique({ where: { bookingId } });
                if (!existingTicket) {
                    await tx.ticket.create({
                        data: {
                            bookingId,
                            ticketNumber: `TKT-${booking.bookingNumber}`,
                            pnrNumber: statusResponse.PNRNo || 'N/A',
                            status: client_1.TicketStatus.ISSUED,
                            bookingSnapshot: booking,
                        },
                    });
                }
            });
            // Queue confirmation notifications
            try {
                const { addJob } = await Promise.resolve().then(() => __importStar(require('../infrastructure/queues')));
                await addJob(constants_1.QueueName.NOTIFICATION_EMAIL, 'booking-confirmation-email', {
                    bookingId,
                    recipient: booking.contactEmail,
                    bookingNumber: booking.bookingNumber,
                });
                await addJob(constants_1.QueueName.NOTIFICATION_SMS, 'booking-confirmation-sms', {
                    bookingId,
                    recipient: booking.contactPhone,
                    bookingNumber: booking.bookingNumber,
                });
            }
            catch (queueErr) {
                workerLogger.warn({ queueErr }, 'Failed to queue notifications after reconciliation confirm');
            }
            workerLogger.info({ bookingId }, 'Reconciliation SUCCESS: Booking marked CONFIRMED and ticket issued');
        }
        else if (statusResponse.Status === -1 || statusResponse.Status === -2) {
            // Provider definitively failed — mark BOOKING_FAILED and trigger refund
            await prisma.booking.update({
                where: { id: bookingId },
                data: { status: client_1.BookingStatus.BOOKING_FAILED },
            });
            // Queue refund for the payment
            const payment = await prisma.payment.findFirst({
                where: { bookingId, status: client_1.PaymentStatus.SUCCESS },
            });
            if (payment) {
                const { addJob } = await Promise.resolve().then(() => __importStar(require('../infrastructure/queues')));
                const refund = await prisma.refund.create({
                    data: {
                        bookingId,
                        paymentId: payment.id,
                        userId: booking.userId ?? null,
                        amount: Number(booking.totalFare),
                        status: client_1.RefundStatus.PENDING,
                        reason: 'Booking failed at provider after reconciliation',
                    },
                });
                await addJob(constants_1.QueueName.REFUND_PROCESSING, 'process-refund', {
                    refundId: refund.id,
                    bookingId,
                    amount: Number(booking.totalFare),
                    gatewayPaymentId: payment.gatewayPaymentId,
                    merchantTxnId: payment.merchantTxnId,
                });
            }
            workerLogger.warn({ bookingId }, 'Reconciliation: Provider confirmed booking failure; auto-refund triggered');
        }
        else {
            // Status 0 or unknown = still in progress at provider; retry via BullMQ exponential backoff
            throw new Error(`Booking ${bookingId} is still in progress at provider (Status: ${statusResponse.Status})`);
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
        const hold = await prisma.seatHold.findUnique({ where: { id: holdId } });
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
 * Dispatches refunds to PhonePe gateway and updates database records
 */
function startRefundWorker() {
    return (0, queues_1.createWorker)(constants_1.QueueName.REFUND_PROCESSING, async (job) => {
        const { refundId, amount, gatewayPaymentId, merchantTxnId } = job.data;
        const prisma = (0, database_1.getPrismaClient)();
        workerLogger.info({ refundId, amount }, 'Processing refund...');
        const refund = await prisma.refund.findUnique({
            where: { id: refundId },
            include: { payment: true, booking: true },
        });
        if (!refund) {
            workerLogger.warn({ refundId }, 'Refund not found, skipping');
            return;
        }
        if (refund.status === client_1.RefundStatus.COMPLETED) {
            workerLogger.info({ refundId }, 'Refund already completed (idempotent)');
            return;
        }
        // Mark as PROCESSING
        await prisma.refund.update({
            where: { id: refundId },
            data: { status: client_1.RefundStatus.PROCESSING, retryCount: { increment: 1 } },
        });
        const originalTxnId = merchantTxnId || refund.payment?.merchantTxnId;
        const originalPaymentId = gatewayPaymentId || refund.payment?.gatewayPaymentId;
        // Attempt PhonePe refund
        if (originalTxnId) {
            const merchantRefundId = `REF-${refundId.slice(0, 8)}-${Date.now()}`;
            const refundResult = await callPhonePeRefund({
                merchantRefundId,
                originalMerchantTxnId: originalTxnId,
                amount,
            });
            if (refundResult.success) {
                await prisma.$transaction(async (tx) => {
                    await tx.refund.update({
                        where: { id: refundId },
                        data: {
                            status: client_1.RefundStatus.COMPLETED,
                            gatewayRefundId: refundResult.refundId || merchantRefundId,
                            completedAt: new Date(),
                        },
                    });
                    // Update payment status to REFUNDED if full refund
                    if (refund.payment) {
                        const totalRefunded = Number(refund.amount);
                        const totalPaid = Number(refund.payment.amount);
                        const newPaymentStatus = totalRefunded >= totalPaid ? client_1.PaymentStatus.REFUNDED : client_1.PaymentStatus.PARTIALLY_REFUNDED;
                        await tx.payment.update({
                            where: { id: refund.payment.id },
                            data: { status: newPaymentStatus },
                        });
                    }
                    // Update booking status to REFUNDED if applicable
                    if (refund.booking) {
                        await tx.booking.update({
                            where: { id: refund.bookingId },
                            data: { status: client_1.BookingStatus.REFUNDED },
                        });
                    }
                });
                workerLogger.info({ refundId, amount, refundResult }, 'Refund successfully processed via PhonePe');
            }
            else {
                // Refund API failed — mark as FAILED; BullMQ will retry
                await prisma.refund.update({
                    where: { id: refundId },
                    data: { status: client_1.RefundStatus.FAILED },
                });
                workerLogger.error({ refundId, code: refundResult.code }, 'PhonePe refund API returned failure — will retry');
                throw new Error(`PhonePe refund failed with code: ${refundResult.code}`);
            }
        }
        else {
            // No payment transaction ID to refund against — mark as FAILED for manual review
            await prisma.refund.update({
                where: { id: refundId },
                data: { status: client_1.RefundStatus.FAILED },
            });
            workerLogger.error({ refundId }, 'Cannot process refund: no original gateway transaction ID available — manual review required');
        }
    });
}
/**
 * 4. Notification Workers (Email & SMS)
 */
function startNotificationWorkers() {
    const emailWorker = (0, queues_1.createWorker)(constants_1.QueueName.NOTIFICATION_EMAIL, async (job) => {
        const { recipient, bookingNumber } = job.data;
        workerLogger.info({ recipient, bookingNumber }, 'Sending booking confirmation email');
        // TODO: Integrate with email service (SendGrid, Postmark, etc.)
    });
    const smsWorker = (0, queues_1.createWorker)(constants_1.QueueName.NOTIFICATION_SMS, async (job) => {
        const { recipient, bookingNumber } = job.data;
        workerLogger.info({ recipient, bookingNumber }, 'Sending booking confirmation SMS');
        // TODO: Integrate with SMS service (Twilio, MSG91, etc.)
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