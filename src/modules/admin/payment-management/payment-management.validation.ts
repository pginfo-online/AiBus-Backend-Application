// ---------------------------------------------------------------------------
// Admin Payment Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
  gateway: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const paymentIdParamsSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
