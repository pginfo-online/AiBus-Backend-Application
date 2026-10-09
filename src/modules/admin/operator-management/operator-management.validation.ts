// ---------------------------------------------------------------------------
// Admin Operator Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listOperatorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  sortBy: z.enum(['name', 'code', 'totalBookings', 'totalRevenue', 'createdAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
}).strict();

export const operatorIdParamsSchema = z.object({
  id: z.string().uuid('Invalid operator ID'),
});

export const createOperatorBodySchema = z.object({
  name: z.string().min(2).max(150).trim(),
  code: z.string().min(2).max(30).trim().toUpperCase(),
  contactEmail: z.string().email().trim(),
  contactPhone: z.string().min(8).max(20).trim(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional().default('ACTIVE'),
  providerName: z.string().max(50).optional().default('GDS'),
  providerOperatorId: z.string().optional(),
  commissionPct: z.number().min(0).max(100).optional().default(0),
  gstNumber: z.string().max(30).optional(),
  panNumber: z.string().max(20).optional(),
  address: z.string().max(250).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export const updateOperatorBodySchema = z.object({
  name: z.string().min(2).max(150).trim().optional(),
  code: z.string().min(2).max(30).trim().toUpperCase().optional(),
  contactEmail: z.string().email().trim().optional(),
  contactPhone: z.string().min(8).max(20).trim().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional(),
  providerName: z.string().max(50).optional(),
  providerOperatorId: z.string().nullable().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  gstNumber: z.string().max(30).nullable().optional(),
  panNumber: z.string().max(20).nullable().optional(),
  address: z.string().max(250).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
}).strict();

export const suspendOperatorBodySchema = z.object({
  reason: z.string().min(3).max(500),
}).strict();

export type ListOperatorsQuery = z.infer<typeof listOperatorsQuerySchema>;
export type CreateOperatorInput = z.infer<typeof createOperatorBodySchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorBodySchema>;
