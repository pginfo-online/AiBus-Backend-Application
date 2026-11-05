import { z } from 'zod';
import { CouponType } from '@prisma/client';

export const listCouponsQuerySchema = z.object({
  category: z.string().optional(),
  type: z.nativeEnum(CouponType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').trim().toUpperCase(),
  totalFare: z.coerce.number().positive('Total fare must be greater than 0'),
  operatorName: z.string().optional(),
  fromCityId: z.coerce.number().int().optional(),
  toCityId: z.coerce.number().int().optional(),
  busId: z.coerce.number().int().optional(),
  userId: z.string().uuid().optional(),
});

export const couponCodeParamSchema = z.object({
  code: z.string().min(1).trim().toUpperCase(),
});

export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CouponCodeParam = z.infer<typeof couponCodeParamSchema>;
