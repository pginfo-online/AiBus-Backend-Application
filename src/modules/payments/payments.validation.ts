import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid('Valid bookingId is required'),
  gateway: z.enum(['PHONEPE', 'RAZORPAY', 'MOCK']).default('PHONEPE'),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  merchantTxnId: z.string().min(1),
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  gatewaySignature: z.string().optional(),
});

export const webhookPayloadSchema = z.object({
  response: z.string(), // base64 encoded response from PhonePe
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
