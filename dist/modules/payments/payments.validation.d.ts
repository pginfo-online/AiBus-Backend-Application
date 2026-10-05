import { z } from 'zod';
export declare const createPaymentIntentSchema: z.ZodObject<{
    bookingId: z.ZodString;
    gateway: z.ZodDefault<z.ZodEnum<{
        PHONEPE: "PHONEPE";
        RAZORPAY: "RAZORPAY";
        MOCK: "MOCK";
    }>>;
}, z.core.$strip>;
export declare const verifyPaymentSchema: z.ZodObject<{
    bookingId: z.ZodString;
    merchantTxnId: z.ZodString;
    gatewayOrderId: z.ZodOptional<z.ZodString>;
    gatewayPaymentId: z.ZodOptional<z.ZodString>;
    gatewaySignature: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const webhookPayloadSchema: z.ZodObject<{
    response: z.ZodString;
}, z.core.$strip>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
//# sourceMappingURL=payments.validation.d.ts.map