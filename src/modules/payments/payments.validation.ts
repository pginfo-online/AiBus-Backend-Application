import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  bookingId: z.string().uuid('Valid bookingId is required'),
  gateway: z.enum(['RAZORPAY', 'AUTO']).default('AUTO'),
  redirectUrl: z.string().optional(),
  paymentMode: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET', 'ALL']).optional(),
});

export const verifyPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  merchantTxnId: z.string().min(1),
  gatewayOrderId: z.string().optional(),
  gatewayPaymentId: z.string().optional(),
  gatewaySignature: z.string().optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
