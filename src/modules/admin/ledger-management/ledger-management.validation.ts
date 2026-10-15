import { z } from 'zod';

export const listLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  type: z
    .enum([
      'AGENT_WALLET_DEBIT',
      'AGENT_WALLET_CREDIT',
      'AGENT_WALLET_TOPUP',
      'COMMISSION_CREDIT',
      'COMMISSION_REVERSAL',
      'REFUND_CREDIT',
      'CONVENIENCE_FEE_DEBIT',
      'CREDIT_LIMIT_UTILIZATION',
      'CREDIT_LIMIT_RELEASE',
      'PLATFORM_REVENUE_CREDIT',
      'MANUAL_ADJUSTMENT',
    ])
    .optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type ListLedgerQuery = z.infer<typeof listLedgerQuerySchema>;

export const manualAdjustmentBodySchema = z.object({
  agentId: z.string().uuid(),
  amount: z.number().positive().max(1000000), // Max 10 lakh single adjustment
  direction: z.enum(['CREDIT_AGENT', 'DEBIT_AGENT']),
  reason: z.string().min(5).max(500),
  idempotencyKey: z.string().uuid().optional(),
});

export type ManualAdjustmentBody = z.infer<typeof manualAdjustmentBodySchema>;
