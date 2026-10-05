"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookPayloadSchema = exports.verifyPaymentSchema = exports.createPaymentIntentSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentIntentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid('Valid bookingId is required'),
    gateway: zod_1.z.enum(['PHONEPE', 'RAZORPAY', 'MOCK']).default('PHONEPE'),
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
//# sourceMappingURL=payments.validation.js.map