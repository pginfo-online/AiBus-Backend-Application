"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayAdapter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
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
            this.client = new razorpay_1.default({
                key_id: keyId,
                key_secret: keySecret,
            });
            razorpayLogger.info({ keyId: keyId.substring(0, 8) + '...' }, 'Razorpay client initialized with live/test credentials');
        }
        else {
            razorpayLogger.warn('Razorpay credentials not fully configured in env; operating in simulation/mock mode');
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
        const keyId = env_1.env.RAZORPAY_KEY_ID || 'rzp_test_mock';
        const keySecret = env_1.env.RAZORPAY_KEY_SECRET || 'mock_secret';
        const merchantTxnId = params.merchantTxnId || `RZP-${params.bookingNumber || 'BKG'}-${Date.now()}`;
        let orderId;
        if (this.client && this.isConfigured() && !env_1.isTest) {
            try {
                const order = await this.client.orders.create({
                    amount: amountInPaise,
                    currency: params.currency || 'INR',
                    receipt: merchantTxnId,
                    notes: {
                        bookingId: params.bookingId,
                        bookingNumber: params.bookingNumber,
                        customerEmail: params.customerEmail || '',
                        customerPhone: params.customerPhone || '',
                        isTopup: params.isTopup ? 'true' : 'false',
                        ...(params.notes || {}),
                    },
                });
                orderId = order.id;
            }
            catch (err) {
                razorpayLogger.error({ err: err.message, bookingId: params.bookingId }, 'Razorpay order creation failed');
                throw new Error(`Razorpay order creation failed: ${err.message}`);
            }
        }
        else {
            // Test environment fallback when network is unavailable
            orderId = `order_test_${Date.now()}`;
            razorpayLogger.info({ orderId, merchantTxnId }, 'Test Razorpay order created for unit/integration testing');
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
        // Standard NPCI UPI Intent URI format
        const upiIntentUrl = `upi://pay?pa=aibus@razorpay&pn=AiBus&tr=${merchantTxnId}&am=${params.amount.toFixed(2)}&cu=INR&tn=Booking_${params.bookingNumber}`;
        return {
            gateway: 'RAZORPAY',
            merchantTxnId,
            gatewayOrderId: orderId,
            amount: params.amount,
            currency: params.currency || 'INR',
            paymentUrl,
            upiIntentUrl,
            sdkPayload,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        };
    }
    /**
     * Verify Razorpay Payment
     * Supports both cryptographic HMAC SHA256 signature verification and API fetch
     */
    async verifyPayment(params) {
        const keySecret = env_1.env.RAZORPAY_KEY_SECRET || 'mock_secret';
        const { gatewayOrderId, gatewayPaymentId, gatewaySignature, merchantTxnId } = params;
        // 1. Webhook-verified payment (Razorpay webhook HMAC was already verified by handleRazorpayWebhook)
        if (gatewaySignature === 'VERIFIED_VIA_WEBHOOK') {
            razorpayLogger.info({ merchantTxnId, gatewayOrderId, gatewayPaymentId }, 'Razorpay payment verified via webhook signature');
            return {
                gateway: 'RAZORPAY',
                success: true,
                status: 'SUCCESS',
                merchantTxnId,
                gatewayOrderId,
                gatewayPaymentId,
            };
        }
        // 2. Cryptographic Signature Verification if client returned orderId, paymentId, signature
        if (gatewayOrderId && gatewayPaymentId && gatewaySignature) {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', keySecret)
                .update(`${gatewayOrderId}|${gatewayPaymentId}`)
                .digest('hex');
            let isSignatureValid = false;
            try {
                const expectedBuf = Buffer.from(generatedSignature, 'utf8');
                const signatureBuf = Buffer.from(gatewaySignature, 'utf8');
                if (expectedBuf.length === signatureBuf.length && crypto_1.default.timingSafeEqual(expectedBuf, signatureBuf)) {
                    isSignatureValid = true;
                }
            }
            catch {
                isSignatureValid = false;
            }
            if (!isSignatureValid && (env_1.isDevelopment || env_1.isTest) && gatewaySignature.startsWith('mock_sig')) {
                isSignatureValid = true;
            }
            if (isSignatureValid) {
                razorpayLogger.info({ merchantTxnId, gatewayPaymentId }, 'Razorpay payment verified successfully via cryptographic HMAC signature');
                return {
                    gateway: 'RAZORPAY',
                    success: true,
                    status: 'SUCCESS',
                    merchantTxnId,
                    gatewayOrderId,
                    gatewayPaymentId,
                };
            }
            else {
                razorpayLogger.warn({ merchantTxnId, gatewayOrderId, gatewayPaymentId }, 'Razorpay payment signature mismatch');
                return {
                    gateway: 'RAZORPAY',
                    success: false,
                    status: 'FAILED',
                    merchantTxnId,
                    gatewayOrderId,
                    gatewayPaymentId,
                    failureReason: 'Cryptographic signature mismatch',
                };
            }
        }
        // 3. Test environment synthetic transaction handling (when no signature is provided)
        if (env_1.isTest && (gatewayPaymentId?.startsWith('pay_sim_') || gatewayOrderId?.startsWith('order_test_'))) {
            razorpayLogger.info({ merchantTxnId, gatewayOrderId, gatewayPaymentId }, 'Synthetic Razorpay transaction verified for test environment');
            return {
                gateway: 'RAZORPAY',
                success: true,
                status: 'SUCCESS',
                merchantTxnId,
                gatewayOrderId,
                gatewayPaymentId,
            };
        }
        // 2. Direct API status check if paymentId is available
        if (this.client && this.isConfigured() && gatewayPaymentId) {
            try {
                const payment = await this.client.payments.fetch(gatewayPaymentId);
                const isCaptured = payment.status === 'captured';
                return {
                    gateway: 'RAZORPAY',
                    success: isCaptured,
                    status: isCaptured ? 'SUCCESS' : payment.status === 'failed' ? 'FAILED' : 'PENDING',
                    merchantTxnId,
                    gatewayOrderId: payment.order_id || gatewayOrderId,
                    gatewayPaymentId: payment.id,
                    amount: Number(payment.amount) / 100,
                    paymentMethod: payment.method,
                    bankTransactionId: payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn,
                    failureReason: payment.error_description || undefined,
                };
            }
            catch (err) {
                razorpayLogger.warn({ err: err.message, gatewayPaymentId }, 'Failed to fetch Razorpay payment via API');
                if (env_1.isDevelopment || env_1.isTest) {
                    return {
                        gateway: 'RAZORPAY',
                        success: false,
                        status: 'PENDING',
                        merchantTxnId,
                    };
                }
                throw err;
            }
        }
        // Insufficient parameters or failed verification
        razorpayLogger.warn({ merchantTxnId, gatewayOrderId, gatewayPaymentId }, 'Razorpay payment verification rejected — missing signature or payment confirmation');
        return {
            gateway: 'RAZORPAY',
            success: false,
            status: 'FAILED',
            merchantTxnId,
            failureReason: 'Missing or invalid payment signature/payment ID from gateway',
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
                const refund = await this.client.payments.refund(params.gatewayPaymentId, {
                    amount: amountInPaise,
                    receipt: params.merchantRefundId,
                    notes: {
                        reason: params.reason || 'Ticket cancellation refund',
                        merchantRefundId: params.merchantRefundId,
                    },
                });
                razorpayLogger.info({ refundId: refund.id, amount: params.amount, paymentId: params.gatewayPaymentId }, 'Razorpay refund executed successfully');
                return {
                    gateway: 'RAZORPAY',
                    success: true,
                    gatewayRefundId: refund.id,
                    code: 'REFUND_SUCCESS',
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
        // Simulation for dev/test
        const mockRefundId = `rfnd_sim_${Date.now()}`;
        razorpayLogger.info({ mockRefundId, amount: params.amount }, 'Simulated Razorpay refund completed');
        return {
            gateway: 'RAZORPAY',
            success: true,
            gatewayRefundId: mockRefundId,
            code: 'REFUND_SUCCESS',
            message: 'Simulated refund processed',
        };
    }
    /**
     * Webhook Signature Verification
     * Matches x-razorpay-signature header using HMAC SHA256
     */
    verifyWebhookSignature(rawBody, headers) {
        const signature = headers['x-razorpay-signature'];
        if (!signature || typeof signature !== 'string') {
            if (env_1.isDevelopment || env_1.isTest)
                return true;
            return false;
        }
        const secret = env_1.env.RAZORPAY_WEBHOOK_SECRET || env_1.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            razorpayLogger.warn('No Razorpay webhook secret configured; rejecting signature in production');
            return env_1.isDevelopment || env_1.isTest;
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
        const eventId = payload.account_id ? `${payload.account_id}_${Date.now()}` : `rzp_evt_${Date.now()}`;
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