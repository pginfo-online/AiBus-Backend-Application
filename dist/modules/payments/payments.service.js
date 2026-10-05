"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const database_1 = require("../../infrastructure/database");
const bookings_service_1 = require("../bookings/bookings.service");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
class PaymentsService {
    static instance;
    bookingsService;
    paymentLogger = logger_1.logger.child({ module: 'payments-service' });
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
                gateway: input.gateway,
                merchantTxnId,
            },
        });
        // Update booking status to PAYMENT_PENDING
        await prisma.booking.update({
            where: { id: booking.id },
            data: { status: client_1.BookingStatus.PAYMENT_PENDING },
        });
        // Generate payment gateway URL / payload
        const redirectUrl = env_1.env.PHONEPE_REDIRECT_URL || `http://localhost:3000/api/v1/payments/verify?merchantTxnId=${merchantTxnId}`;
        return {
            paymentId: payment.id,
            merchantTxnId,
            amount,
            currency: 'INR',
            gateway: input.gateway,
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
        if (payment.status === client_1.PaymentStatus.SUCCESS) {
            return { status: 'SUCCESS', payment, booking: payment.booking };
        }
        // In a live gateway, we verify signature or call PhonePe Status Check API:
        // GET /v3/transaction/{merchantId}/{merchantTxnId}/status with X-VERIFY header.
        // For sandbox / test development, simulate successful gateway confirmation:
        const isSuccess = true;
        if (!isSuccess) {
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
            throw new errors_1.PaymentFailedError('Payment failed or was declined by issuing bank');
        }
        // 1. Mark Payment SUCCESS
        const updatedPayment = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: client_1.PaymentStatus.SUCCESS,
                gatewayOrderId: input.gatewayOrderId ?? `ORDER-${Date.now()}`,
                gatewayPaymentId: input.gatewayPaymentId ?? `PAY-${Date.now()}`,
                gatewaySignature: input.gatewaySignature ?? 'VERIFIED_SIG',
                webhookVerified: true,
            },
        });
        // 2. Mark Booking PAYMENT_SUCCESS
        await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: client_1.BookingStatus.PAYMENT_SUCCESS },
        });
        // 3. Complete upstream booking with provider!
        const confirmedBooking = await this.bookingsService.confirmBooking(payment.bookingId);
        return {
            status: 'SUCCESS',
            payment: updatedPayment,
            booking: confirmedBooking,
        };
    }
    async handleWebhook(rawBody, xVerifyHeader) {
        const prisma = (0, database_1.getPrismaClient)();
        const eventId = `wh-${(0, uuid_1.v4)()}`;
        // Verify PhonePe signature if headers provided: SHA256(rawBody + saltKey) + "###" + saltIndex
        const verified = true; // In sandbox / local, accept and process
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
        try {
            const decodedPayload = JSON.parse(Buffer.from(rawBody, 'base64').toString('utf-8'));
            const merchantTxnId = decodedPayload.data?.merchantTransactionId;
            if (merchantTxnId) {
                await this.verifyPayment({
                    bookingId: decodedPayload.data?.merchantUserId,
                    merchantTxnId,
                });
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
            throw err;
        }
    }
}
exports.PaymentsService = PaymentsService;
//# sourceMappingURL=payments.service.js.map