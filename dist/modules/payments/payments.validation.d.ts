import { z } from 'zod';
export declare const createPaymentIntentSchema: z.ZodObject<{
    bookingId: z.ZodString;
    gateway: z.ZodDefault<z.ZodEnum<{
        RAZORPAY: "RAZORPAY";
        AUTO: "AUTO";
    }>>;
    redirectUrl: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodOptional<z.ZodEnum<{
        WALLET: "WALLET";
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
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
//# sourceMappingURL=payments.validation.d.ts.map