"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../../config/env");
const logger_1 = require("../../logger");
const razorpayLogger = logger_1.logger.child({ module: 'razorpay-adapter' });
class RazorpayAdapter {
    gatewayName = 'RAZORPAY';
    client = null;
    constructor() {
        this.initClient();
    }
    initClient() {
        const keyId = env_1.env.RAZORPAY_KEY_ID;
        const keySecret = env_1.env.RAZORPAY_KEY_SECRET;
        if (keyId && keySecret) {
            this.client = axios_1.default.create({
                baseURL: 'https://api.razorpay.com/v1',
                auth: { username: keyId, password: keySecret },
                maxRedirects: 0,
                timeout: 10_000,
            });
            razorpayLogger.info({ keyId: keyId.substring(0, 8) + '...' }, 'Razorpay client initialized with live/test credentials');
        }
        else {
            razorpayLogger.warn('Razorpay credentials not fully configured in env; Razorpay operations are unavailable');
        }
    }
    isConfigured() {
        return Boolean(env_1.env.RAZORPAY_KEY_ID && env_1.env.RAZORPAY_KEY_SECRET);
    }
    /**
     * Create Razorpay Order
     * Generates order ID and prepares native SDK payload for Web & Mobile UPI Intent
     */
    async createPaymentIntent(params) {
        const amountInPaise = Math.round(params.amount * 100);
        if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
            throw new Error('Razorpay order amount must be at least INR 1');
        }
        const keyId = env_1.env.RAZORPAY_KEY_ID;
        const merchantTxnId = params.merchantTxnId || crypto_1.default.randomUUID();
        let orderId;
        if (this.client && this.isConfigured()) {
            try {
                const { data: order } = await this.client.post('/orders', {
                    amount: amountInPaise,
                    currency: params.currency || 'INR',
                    receipt: merchantTxnId,
                    notes: {
                        bookingId: params.bookingId,
                        bookingNumber: params.bookingNumber,
                        merchantTxnId,
                        isTopup: params.isTopup ? 'true' : 'false',
                        ...(params.notes || {}),
                    },
                });
                if (!order.id?.startsWith('order_'))
                    throw new Error('Invalid Razorpay order response');
                orderId = order.id;
            }
            catch (err) {
                razorpayLogger.error({ err: err.message, bookingId: params.bookingId }, 'Razorpay order creation failed');
                throw new Error(`Razorpay order creation failed: ${err.message}`);
            }
        }
        else {
            throw new Error('Razorpay credentials are required');
        }
        // Prepare client-side payload for Web checkout & Mobile native UPI Intent
        const sdkPayload = {
            key: keyId,
            amount: amountInPaise,
            currency: params.currency || 'INR',
            name: env_1.env.APP_NAME || 'AiBus',
            description: `Bus Booking #${params.bookingNumber}`,
            order_id: orderId,
            prefill: {
                name: params.customerName || '',
                email: params.customerEmail || '',
                contact: params.customerPhone || '',
            },
            notes: {
                bookingId: params.bookingId,
                bookingNumber: params.bookingNumber,
                merchantTxnId,
            },
            theme: {
                color: '#013C9A', // Primary brand color
            },
            // Native UPI intent configuration (Android & iOS direct deep-link triggers)
            upi: {
                flow: 'intent',
            },
            modal: {
                confirm_close: true,
            },
        };
        // Construct universal payment URL (Razorpay Hosted Checkout / redirect)
        const baseRedirect = params.redirectUrl || `/api/v1/payments/checkout/${merchantTxnId}`;
        const paymentUrl = baseRedirect.includes('checkout')
            ? baseRedirect
            : `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}gateway=RAZORPAY&orderId=${orderId}&merchantTxnId=${merchantTxnId}`;
        return {
            gateway: 'RAZORPAY',
            merchantTxnId,
            gatewayOrderId: orderId,
            amount: params.amount,
            currency: params.currency || 'INR',
            paymentUrl,
            sdkPayload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        };
    }
    /**
     * Verify Razorpay Payment
     * Supports both cryptographic HMAC SHA256 signature verification and API fetch
     */
    async verifyPayment(params) {
        const { gatewayOrderId, gatewayPaymentId, gatewaySignature, merchantTxnId } = params;
        const result = { gateway: this.gatewayName, merchantTxnId, success: false, status: 'PENDING' };
        const secret = env_1.env.RAZORPAY_KEY_SECRET;
        if (!this.client || !secret || !gatewayOrderId || !gatewayPaymentId)
            return result;
        if (gatewaySignature !== undefined) {
            const expected = crypto_1.default.createHmac('sha256', secret)
                .update(`${gatewayOrderId}|${gatewayPaymentId}`).digest();
            if (!/^[a-f0-9]{64}$/i.test(gatewaySignature)
                || !crypto_1.default.timingSafeEqual(expected, Buffer.from(gatewaySignature, 'hex')))
                return result;
        }
        if (!/^pay_[a-zA-Z0-9]+$/.test(gatewayPaymentId))
            return result;
        const { data: payment } = await this.client.get(`/payments/${gatewayPaymentId}`);
        if (payment.id !== gatewayPaymentId || payment.order_id !== gatewayOrderId || payment.currency !== 'INR'
            || !Number.isSafeInteger(Number(payment.amount)) || payment.status !== 'captured')
            return result;
        return {
            ...result, success: true, status: 'SUCCESS',
            gatewayOrderId, gatewayPaymentId: payment.id, amount: Number(payment.amount) / 100,
            paymentMethod: payment.method,
            bankTransactionId: payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn,
        };
    }
    /**
     * Process Refund via Razorpay API
     */
    async processRefund(params) {
        if (!params.gatewayPaymentId) {
            return {
                gateway: 'RAZORPAY',
                success: false,
                code: 'MISSING_PAYMENT_ID',
                message: 'No Razorpay payment ID provided for refund',
            };
        }
        const amountInPaise = Math.round(params.amount * 100);
        if (this.client && this.isConfigured()) {
            try {
                const path = `/payments/${encodeURIComponent(params.gatewayPaymentId)}/refund`;
                const { data: refund } = params.gatewayRefundId
                    ? await this.client.get(`${path}s/${encodeURIComponent(params.gatewayRefundId)}`)
                    : await this.client.post(path, {
                        amount: amountInPaise,
                        receipt: params.merchantRefundId,
                        notes: { reason: params.reason || 'Ticket cancellation refund' },
                    }, { headers: { 'X-Refund-Idempotency': params.merchantRefundId } });
                razorpayLogger.info({ refundId: refund.id, amount: params.amount, paymentId: params.gatewayPaymentId }, 'Razorpay refund executed successfully');
                return {
                    gateway: 'RAZORPAY',
                    success: refund.status === 'processed',
                    gatewayRefundId: refund.id,
                    code: refund.status === 'processed' ? 'REFUND_SUCCESS' : refund.status === 'pending' ? 'REFUND_PENDING' : 'REFUND_FAILED',
                    message: 'Refund successfully initiated via Razorpay',
                };
            }
            catch (err) {
                razorpayLogger.error({ err: err.message, paymentId: params.gatewayPaymentId }, 'Razorpay refund API call failed');
                return {
                    gateway: 'RAZORPAY',
                    success: false,
                    code: err.error?.code || 'REFUND_FAILED',
                    message: err.error?.description || err.message,
                };
            }
        }
        return { gateway: 'RAZORPAY', success: false, code: 'NOT_CONFIGURED' };
    }
    /**
     * Webhook Signature Verification
     * Matches x-razorpay-signature header using HMAC SHA256
     */
    verifyWebhookSignature(rawBody, headers) {
        const signature = headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            return false;
        }
        const secret = env_1.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            razorpayLogger.warn('No Razorpay webhook secret configured; rejecting signature in production');
            return false;
        }
        const expectedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');
        const expectedBuf = Buffer.from(expectedSignature, 'utf8');
        const signatureBuf = Buffer.from(signature, 'utf8');
        if (expectedBuf.length !== signatureBuf.length) {
            return false;
        }
        return crypto_1.default.timingSafeEqual(expectedBuf, signatureBuf);
    }
    /**
     * Parse Razorpay Webhook Payload into unified structure
     */
    parseWebhookPayload(rawBody) {
        const payload = JSON.parse(rawBody);
        const event = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;
        const orderEntity = payload.payload?.order?.entity;
        const eventId = crypto_1.default.createHash('sha256').update(rawBody).digest('hex');
        const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;
        const gatewayPaymentId = paymentEntity?.id;
        const merchantTxnId = paymentEntity?.notes?.merchantTxnId ||
            orderEntity?.receipt ||
            `RZP-${gatewayOrderId || Date.now()}`;
        let status = 'PENDING';
        if (event === 'payment.captured' || event === 'order.paid') {
            status = 'SUCCESS';
        }
        else if (event === 'payment.failed') {
            status = 'FAILED';
        }
        else {
            status = 'IGNORED';
        }
        return {
            gateway: 'RAZORPAY',
            eventId,
            eventType: event,
            merchantTxnId,
            gatewayOrderId,
            gatewayPaymentId,
            amount: paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : undefined,
            status,
            rawPayload: payload,
        };
    }
}
exports.RazorpayAdapter = RazorpayAdapter;
//# sourceMappingURL=RazorpayAdapter.js.map