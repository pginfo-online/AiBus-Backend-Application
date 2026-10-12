"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateWebhookSchema = exports.webhookPayloadSchema = exports.verifyPaymentSchema = exports.createPaymentIntentSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentIntentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid('Valid bookingId is required'),
    gateway: zod_1.z.enum(['PHONEPE', 'RAZORPAY', 'MOCK']).default('PHONEPE'),
    redirectUrl: zod_1.z.string().optional(),
    paymentMode: zod_1.z.enum(['UPI', 'CARD', 'NETBANKING', 'ALL']).optional(),
});
exports.verifyPaymentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid(),
    merchantTxnId: zod_1.z.string().min(1),
    gatewayOrderId: zod_1.z.string().optional(),
    gatewayPaymentId: zod_1.z.string().optional(),
    gatewaySignature: zod_1.z.string().optional(),
});
exports.webhookPayloadSchema = zod_1.z.object({
    response: zod_1.z.string(), // base64 encoded response from PhonePe
});
exports.simulateWebhookSchema = zod_1.z.object({
    merchantTxnId: zod_1.z.string().min(1, 'merchantTxnId is required'),
    status: zod_1.z.enum(['SUCCESS', 'DECLINED', 'TIMED_OUT']).default('SUCCESS'),
    reason: zod_1.z.string().optional(),
});
//# sourceMappingURL=payments.validation.js.map