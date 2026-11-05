"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentSchema = exports.createPaymentIntentSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentIntentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid('Valid bookingId is required'),
    gateway: zod_1.z.enum(['RAZORPAY', 'AUTO']).default('AUTO'),
    redirectUrl: zod_1.z.string().optional(),
    paymentMode: zod_1.z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'ALL']).optional(),
});
exports.verifyPaymentSchema = zod_1.z.object({
    bookingId: zod_1.z.string().uuid(),
    merchantTxnId: zod_1.z.string().min(1),
    gatewayOrderId: zod_1.z.string().optional(),
    gatewayPaymentId: zod_1.z.string().optional(),
    gatewaySignature: zod_1.z.string().optional(),
});
//# sourceMappingURL=payments.validation.js.map