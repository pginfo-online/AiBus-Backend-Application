// ---------------------------------------------------------------------------
// Admin Refund Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listRefundsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
  destination: z.enum(['ORIGINAL_PAYMENT_METHOD', 'WALLET']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const refundIdParamsSchema = z.object({
  id: z.string().uuid('Invalid refund ID'),
});

export const processRefundBodySchema = z.object({
  notes: z.string().max(500).optional(),
}).strict();

export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>;
