// ---------------------------------------------------------------------------
// Admin Coupon Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  type: z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional(),
  sortBy: z.enum(['code', 'usedCount', 'validUntil', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const couponIdParamsSchema = z.object({
  id: z.string().uuid('Invalid coupon ID'),
});

export const createCouponBodySchema = z.object({
  code: z.string().min(3).max(30).trim().toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']),
  value: z.number().positive(),
  maxDiscount: z.number().positive().optional(),
  minOrderValue: z.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional().default('ACTIVE'),
  description: z.string().max(250).optional(),
  termsAndConditions: z.string().max(1000).optional(),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerUser: z.number().int().positive().optional().default(1),
  applicableRoutes: z.array(z.string().trim()).optional(),
  applicableOperators: z.array(z.string().trim()).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
}).strict().refine((data) => new Date(data.validUntil) > new Date(data.validFrom), {
  message: 'validUntil must be after validFrom',
  path: ['validUntil'],
});

export const updateCouponBodySchema = z.object({
  code: z.string().min(3).max(30).trim().toUpperCase().optional(),
  type: z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']).optional(),
  value: z.number().positive().optional(),
  maxDiscount: z.number().positive().nullable().optional(),
  minOrderValue: z.number().nonnegative().nullable().optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional(),
  description: z.string().max(250).nullable().optional(),
  termsAndConditions: z.string().max(1000).nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  usageLimitPerUser: z.number().int().positive().nullable().optional(),
  applicableRoutes: z.array(z.string().trim()).nullable().optional(),
  applicableOperators: z.array(z.string().trim()).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
}).strict();

export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type CreateCouponInput = z.infer<typeof createCouponBodySchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponBodySchema>;
