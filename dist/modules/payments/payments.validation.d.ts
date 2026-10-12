import { z } from 'zod';
export declare const createPaymentIntentSchema: z.ZodObject<{
    bookingId: z.ZodString;
    gateway: z.ZodDefault<z.ZodEnum<{
        PHONEPE: "PHONEPE";
        RAZORPAY: "RAZORPAY";
        MOCK: "MOCK";
    }>>;
    redirectUrl: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodOptional<z.ZodEnum<{
        ALL: "ALL";
        UPI: "UPI";
        CARD: "CARD";
        NETBANKING: "NETBANKING";
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
export declare const simulateWebhookSchema: z.ZodObject<{
    merchantTxnId: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<{
        SUCCESS: "SUCCESS";
        TIMED_OUT: "TIMED_OUT";
        DECLINED: "DECLINED";
    }>>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
export type SimulateWebhookInput = z.infer<typeof simulateWebhookSchema>;
//# sourceMappingURL=payments.validation.d.ts.map