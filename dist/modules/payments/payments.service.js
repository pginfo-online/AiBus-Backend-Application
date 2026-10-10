"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const database_1 = require("../../infrastructure/database");
const bookings_service_1 = require("../bookings/bookings.service");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
const paymentLogger = logger_1.logger.child({ module: 'payments-service' });
// ---------------------------------------------------------------------------
// PhonePe Sandbox / Production API
// ---------------------------------------------------------------------------
const PHONEPE_API_BASE = env_1.env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
/**
 * Build X-VERIFY header: SHA256(base64Payload + apiEndpoint + saltKey) + "###" + saltIndex
 */
function buildPhonePeVerifyHeader(base64Payload, endpoint) {
    const saltKey = env_1.env.PHONEPE_CLIENT_SECRET;
    const saltIndex = env_1.env.PHONEPE_CLIENT_VERSION || '1';
    const hash = crypto_1.default
        .createHash('sha256')
        .update(base64Payload + endpoint + saltKey)
        .digest('hex');
    return `${hash}###${saltIndex}`;
}
/**
 * Call PhonePe Check Status API to verify payment status server-side.
 * Endpoint: GET /v3/transaction/{merchantId}/{merchantTxnId}/status
 */
async function checkPhonePePaymentStatus(merchantTxnId) {
    const merchantId = env_1.env.PHONEPE_MERCHANT_ID;
    const endpoint = `/v3/transaction/${merchantId}/${merchantTxnId}/status`;
    const xVerify = buildPhonePeVerifyHeader('', endpoint);
    try {
        const response = await axios_1.default.get(`${PHONEPE_API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': merchantId,
            },
            timeout: 15000,
        });
        const data = response.data;
        paymentLogger.info({ merchantTxnId, code: data?.code }, 'PhonePe status check response');
        return {
            code: data?.code || 'UNKNOWN',
            success: data?.code === 'PAYMENT_SUCCESS',
            transactionId: data?.data?.transactionId,
            amount: data?.data?.amount ? Number(data.data.amount) / 100 : undefined, // PhonePe returns paise
            paymentInstrumentType: data?.data?.paymentInstrument?.type,
        };
    }
    catch (err) {
        paymentLogger.error({ err: err.message, status: err.response?.status, merchantTxnId }, 'PhonePe status check API call failed');
        throw err;
    }
}
class PaymentsService {
    static instance;
    bookingsService;
    constructor() {
        this.bookingsService = bookings_service_1.BookingsService.getInstance();
    }
    static getInstance() {
        if (!PaymentsService.instance) {
            PaymentsService.instance = new PaymentsService();
        }
        return PaymentsService.instance;
    }
    async createPaymentIntent(input, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({
            where: { id: input.bookingId },
        });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.status !== client_1.BookingStatus.HELD && booking.status !== client_1.BookingStatus.INITIATED) {
            throw new errors_1.ValidationError(`Cannot initiate payment for booking in status ${booking.status}`);
        }
        // Idempotency: return existing PENDING payment if one exists
        const existingPayment = await prisma.payment.findFirst({
            where: { bookingId: booking.id, status: client_1.PaymentStatus.PENDING },
            orderBy: { createdAt: 'desc' },
        });
        if (existingPayment) {
            paymentLogger.info({ bookingId: booking.id, paymentId: existingPayment.id }, 'Returning existing PENDING payment intent (idempotent)');
            const redirectUrl = env_1.env.PHONEPE_REDIRECT_URL ||
                `${PHONEPE_API_BASE}/pay?merchantTxnId=${existingPayment.merchantTxnId}`;
            return {
                paymentId: existingPayment.id,
                merchantTxnId: existingPayment.merchantTxnId,
                amount: Number(existingPayment.amount),
                currency: 'INR',
                gateway: existingPayment.gateway,
                paymentUrl: redirectUrl,
            };
        }
        const merchantTxnId = `TXN-${booking.bookingNumber}-${Date.now()}`;
        const amount = Number(booking.totalFare);
        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                bookingId: booking.id,
                userId: userId ?? booking.userId ?? null,
                amount,
                currency: 'INR',
                status: client_1.PaymentStatus.PENDING,
                gateway: input.gateway || 'PHONEPE',
                merchantTxnId,
            },
        });
        // Update booking status to PAYMENT_PENDING
        await prisma.booking.update({
            where: { id: booking.id },
            data: { status: client_1.BookingStatus.PAYMENT_PENDING },
        });
        // Generate PhonePe payment URL
        // In sandbox mode, we use the paymentUrl from env for mobile deep link redirect
        const redirectUrl = env_1.env.PHONEPE_REDIRECT_URL ||
            `${PHONEPE_API_BASE}/pg/v1/pay?merchantTxnId=${merchantTxnId}`;
        paymentLogger.info({ bookingId: booking.id, paymentId: payment.id, merchantTxnId, amount }, 'Payment intent created');
        return {
            paymentId: payment.id,
            merchantTxnId,
            amount,
            currency: 'INR',
            gateway: input.gateway || 'PHONEPE',
            paymentUrl: redirectUrl,
        };
    }
    async verifyPayment(input) {
        const prisma = (0, database_1.getPrismaClient)();
        const payment = await prisma.payment.findUnique({
            where: { merchantTxnId: input.merchantTxnId },
            include: { booking: true },
        });
        if (!payment) {
            throw new errors_1.NotFoundError('Payment transaction not found');
        }
        // Idempotency: if already SUCCESS and booking CONFIRMED, return immediately
        if (payment.status === client_1.PaymentStatus.SUCCESS) {
            paymentLogger.info({ paymentId: payment.id, bookingId: payment.bookingId }, 'Payment already verified (idempotent return)');
            const confirmedBooking = await prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: { seats: true, passengers: true, ticket: true },
            });
            return { status: 'SUCCESS', payment, booking: confirmedBooking || payment.booking };
        }
        // Prevent double-processing: use optimistic lock to claim this verification
        // Only proceed if booking is still in PAYMENT_PENDING state
        const currentBooking = await prisma.booking.findUnique({
            where: { id: payment.bookingId },
        });
        if (!currentBooking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        // If booking already progressed past PAYMENT_PENDING, return current state
        if (currentBooking.status === client_1.BookingStatus.CONFIRMED ||
            currentBooking.status === client_1.BookingStatus.BOOKING_UNKNOWN ||
            currentBooking.status === client_1.BookingStatus.BOOKING_FAILED) {
            paymentLogger.info({ bookingId: currentBooking.id, status: currentBooking.status }, 'Booking already in post-payment state, returning current status');
            return {
                status: currentBooking.status === client_1.BookingStatus.CONFIRMED ? 'SUCCESS' : 'PENDING',
                payment,
                booking: currentBooking,
            };
        }
        // -----------------------------------------------------------------------
        // CRITICAL: Server-side payment verification via PhonePe Status Check API
        // Never trust frontend payment success — always verify with gateway
        // -----------------------------------------------------------------------
        let gatewayVerification;
        try {
            gatewayVerification = await checkPhonePePaymentStatus(input.merchantTxnId);
        }
        catch (gatewayErr) {
            // If PhonePe check fails (network), we cannot proceed — return PENDING
            paymentLogger.warn({ merchantTxnId: input.merchantTxnId, err: gatewayErr.message }, 'PhonePe status check failed — returning PAYMENT_PENDING for retry');
            return { status: 'PENDING', payment, booking: currentBooking };
        }
        paymentLogger.info({ merchantTxnId: input.merchantTxnId, code: gatewayVerification.code, success: gatewayVerification.success }, 'PhonePe gateway verification result');
        // Handle pending status — client should retry with exponential backoff
        if (gatewayVerification.code === 'PAYMENT_PENDING' ||
            gatewayVerification.code === 'PAYMENT_INITIATED') {
            return { status: 'PENDING', payment, booking: currentBooking };
        }
        // Handle payment failure
        if (!gatewayVerification.success) {
            await prisma.$transaction([
                prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: client_1.PaymentStatus.FAILED },
                }),
                prisma.booking.update({
                    where: { id: payment.bookingId },
                    data: { status: client_1.BookingStatus.PAYMENT_FAILED },
                }),
            ]);
            paymentLogger.warn({ merchantTxnId: input.merchantTxnId, code: gatewayVerification.code }, 'Payment failed or declined');
            throw new errors_1.PaymentFailedError('Payment failed or was declined by issuing bank');
        }
        // -----------------------------------------------------------------------
        // Payment SUCCESS: mark payment, then call GDS BookSeats
        // -----------------------------------------------------------------------
        // Atomic: transition booking to PAYMENT_SUCCESS to claim it for this request
        const updateResult = await prisma.booking.updateMany({
            where: { id: payment.bookingId, status: client_1.BookingStatus.PAYMENT_PENDING },
            data: { status: client_1.BookingStatus.PAYMENT_SUCCESS },
        });
        // If updateResult.count === 0, another request already claimed it — return current state
        if (updateResult.count === 0) {
            paymentLogger.warn({ bookingId: payment.bookingId }, 'Booking already being processed by another request (concurrent verification)');
            const latestBooking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
            return {
                status: latestBooking?.status === client_1.BookingStatus.CONFIRMED ? 'SUCCESS' : 'PENDING',
                payment,
                booking: latestBooking || currentBooking,
            };
        }
        // Mark payment SUCCESS
        const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: client_1.PaymentStatus.SUCCESS,
                gatewayOrderId: input.gatewayOrderId ?? gatewayVerification.transactionId ?? `ORDER-${Date.now()}`,
                gatewayPaymentId: input.gatewayPaymentId ?? gatewayVerification.transactionId ?? `PAY-${Date.now()}`,
                gatewaySignature: input.gatewaySignature ?? 'VERIFIED_VIA_STATUS_API',
                webhookVerified: true,
            },
        });
        paymentLogger.info({ bookingId: payment.bookingId, paymentId: payment.id }, 'Payment marked SUCCESS, calling GDS BookSeats');
        // Call GDS BookSeats — this may throw for BOOKING_UNKNOWN/BOOKING_FAILED
        try {
            const confirmedBooking = await this.bookingsService.confirmBooking(payment.bookingId);
            return {
                status: 'SUCCESS',
                payment: updatedPayment,
                booking: confirmedBooking,
            };
        }
        catch (err) {
            // confirmBooking handles BOOKING_UNKNOWN and BOOKING_FAILED internally
            // Re-throw so the controller can return the appropriate HTTP status
            throw err;
        }
    }
    /**
     * Handle PhonePe webhook event
     * POST /api/v1/payments/webhook
     * Body: { response: "<base64EncodedPayload>" }
     * Header: X-VERIFY: SHA256(base64Payload + saltKey) + "###" + saltIndex
     */
    async handleWebhook(rawBody, xVerifyHeader) {
        const prisma = (0, database_1.getPrismaClient)();
        const eventId = `wh-${(0, uuid_1.v4)()}`;
        // -----------------------------------------------------------------------
        // Step 1: Verify PhonePe webhook signature
        // SHA256(base64EncodedResponse + saltKey) + "###" + saltIndex
        // -----------------------------------------------------------------------
        let verified = false;
        if (xVerifyHeader && rawBody) {
            const saltKey = env_1.env.PHONEPE_CLIENT_SECRET;
            const saltIndex = env_1.env.PHONEPE_CLIENT_VERSION || '1';
            const expectedHash = crypto_1.default
                .createHash('sha256')
                .update(rawBody + saltKey)
                .digest('hex');
            const expectedHeader = `${expectedHash}###${saltIndex}`;
            verified = xVerifyHeader === expectedHeader;
            if (!verified) {
                paymentLogger.warn({ eventId, receivedHeader: xVerifyHeader?.substring(0, 20) + '...' }, 'Webhook signature verification failed — possible unauthorized request');
            }
        }
        else {
            // Sandbox/development: allow without signature
            verified = env_1.env.NODE_ENV === 'development';
            paymentLogger.warn({ eventId }, 'Webhook received without X-VERIFY header');
        }
        // Persist webhook event for audit and idempotency
        const webhookEvent = await prisma.webhookEvent.create({
            data: {
                eventId,
                gateway: 'PHONEPE',
                eventType: 'PAYMENT_STATUS_UPDATE',
                payload: { raw: rawBody },
                signature: xVerifyHeader,
                verified,
            },
        });
        if (!verified && env_1.env.NODE_ENV === 'production') {
            await prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: { processingError: 'Webhook signature verification failed' },
            });
            paymentLogger.error({ eventId }, 'Rejected unverified webhook in production');
            return { status: 'REJECTED', reason: 'Invalid signature' };
        }
        // -----------------------------------------------------------------------
        // Step 2: Check for duplicate processing (idempotency)
        // -----------------------------------------------------------------------
        const existingProcessed = await prisma.webhookEvent.findFirst({
            where: {
                eventId: { not: webhookEvent.id },
                gateway: 'PHONEPE',
                processed: true,
                payload: { path: ['raw'], equals: rawBody },
            },
        });
        if (existingProcessed) {
            paymentLogger.info({ eventId, existingId: existingProcessed.id }, 'Duplicate webhook — skipping (idempotent)');
            await prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: { processed: true, processedAt: new Date() },
            });
            return { status: 'OK', note: 'DUPLICATE_SKIPPED' };
        }
        try {
            // -----------------------------------------------------------------------
            // Step 3: Decode and process PhonePe webhook payload
            // -----------------------------------------------------------------------
            let decodedPayload;
            try {
                decodedPayload = JSON.parse(Buffer.from(rawBody, 'base64').toString('utf-8'));
            }
            catch {
                throw new Error('Invalid webhook payload: could not decode base64 JSON');
            }
            const merchantTxnId = decodedPayload?.data?.merchantTransactionId;
            const phonepeCode = decodedPayload?.code;
            paymentLogger.info({ eventId, merchantTxnId, code: phonepeCode }, 'Processing webhook event');
            if (merchantTxnId) {
                // Look up payment by merchantTxnId (not by merchantUserId — that's the user)
                const payment = await prisma.payment.findUnique({
                    where: { merchantTxnId },
                    include: { booking: true },
                });
                if (payment) {
                    if (phonepeCode === 'PAYMENT_SUCCESS') {
                        // Verify then confirm booking
                        await this.verifyPayment({
                            bookingId: payment.bookingId,
                            merchantTxnId,
                        }).catch((err) => {
                            paymentLogger.warn({ err: err.message, merchantTxnId }, 'verifyPayment from webhook encountered error (may be BOOKING_UNKNOWN/FAILED — handled by workers)');
                        });
                    }
                    else if (phonepeCode === 'PAYMENT_ERROR' ||
                        phonepeCode === 'PAYMENT_DECLINED' ||
                        phonepeCode === 'TIMED_OUT') {
                        // Mark payment and booking as failed if still pending
                        if (payment.status === client_1.PaymentStatus.PENDING) {
                            await prisma.$transaction([
                                prisma.payment.update({
                                    where: { id: payment.id },
                                    data: { status: client_1.PaymentStatus.FAILED },
                                }),
                                prisma.booking.update({
                                    where: { id: payment.bookingId, status: client_1.BookingStatus.PAYMENT_PENDING },
                                    data: { status: client_1.BookingStatus.PAYMENT_FAILED },
                                }),
                            ]);
                            paymentLogger.warn({ merchantTxnId, code: phonepeCode }, 'Payment marked FAILED via webhook');
                        }
                    }
                    else {
                        paymentLogger.info({ merchantTxnId, code: phonepeCode }, 'Unhandled PhonePe webhook code — logged only');
                    }
                }
                else {
                    paymentLogger.warn({ merchantTxnId }, 'Webhook received for unknown merchantTxnId');
                }
            }
            await prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: { processed: true, processedAt: new Date() },
            });
            return { status: 'OK' };
        }
        catch (err) {
            await prisma.webhookEvent.update({
                where: { id: webhookEvent.id },
                data: { processingError: err.message },
            });
            paymentLogger.error({ err: err.message, eventId }, 'Webhook processing error');
            throw err;
        }
    }
}
exports.PaymentsService = PaymentsService;
//# sourceMappingURL=payments.service.js.map