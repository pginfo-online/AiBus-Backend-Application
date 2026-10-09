// ---------------------------------------------------------------------------
// Admin Provider Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listProviderTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  providerName: z.string().trim().optional(),
  operation: z.string().trim().optional(),
  bookingId: z.string().uuid().optional(),
  responseStatus: z.coerce.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'durationMs', 'responseStatus']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const providerNameParamsSchema = z.object({
  name: z.string().min(2).max(50).trim(),
});

export const transactionIdParamsSchema = z.object({
  id: z.string().uuid('Invalid transaction ID'),
});

export type ListProviderTransactionsQuery = z.infer<typeof listProviderTransactionsQuerySchema>;
