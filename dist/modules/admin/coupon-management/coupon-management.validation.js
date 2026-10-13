"use strict";
// ---------------------------------------------------------------------------
// Admin Coupon Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCouponBodySchema = exports.createCouponBodySchema = exports.couponIdParamsSchema = exports.listCouponsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listCouponsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().trim().optional(),
    type: zod_1.z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional(),
    sortBy: zod_1.z.enum(['code', 'usedCount', 'validUntil', 'createdAt']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.couponIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid coupon ID'),
});
exports.createCouponBodySchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(30).trim().toUpperCase(),
    type: zod_1.z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']),
    value: zod_1.z.number().positive(),
    maxDiscount: zod_1.z.number().positive().optional(),
    minOrderValue: zod_1.z.number().nonnegative().optional(),
    status: zod_1.z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional().default('ACTIVE'),
    description: zod_1.z.string().max(250).optional(),
    termsAndConditions: zod_1.z.string().max(1000).optional(),
    usageLimit: zod_1.z.number().int().positive().optional(),
    usageLimitPerUser: zod_1.z.number().int().positive().optional().default(1),
    applicableRoutes: zod_1.z.array(zod_1.z.string().trim()).optional(),
    applicableOperators: zod_1.z.array(zod_1.z.string().trim()).optional(),
    validFrom: zod_1.z.string().datetime(),
    validUntil: zod_1.z.string().datetime(),
}).strict().refine((data) => new Date(data.validUntil) > new Date(data.validFrom), {
    message: 'validUntil must be after validFrom',
    path: ['validUntil'],
});
exports.updateCouponBodySchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(30).trim().toUpperCase().optional(),
    type: zod_1.z.enum(['PERCENTAGE', 'FLAT', 'CASHBACK']).optional(),
    value: zod_1.z.number().positive().optional(),
    maxDiscount: zod_1.z.number().positive().nullable().optional(),
    minOrderValue: zod_1.z.number().nonnegative().nullable().optional(),
    status: zod_1.z.enum(['ACTIVE', 'EXPIRED', 'EXHAUSTED', 'DISABLED']).optional(),
    description: zod_1.z.string().max(250).nullable().optional(),
    termsAndConditions: zod_1.z.string().max(1000).nullable().optional(),
    usageLimit: zod_1.z.number().int().positive().nullable().optional(),
    usageLimitPerUser: zod_1.z.number().int().positive().nullable().optional(),
    applicableRoutes: zod_1.z.array(zod_1.z.string().trim()).nullable().optional(),
    applicableOperators: zod_1.z.array(zod_1.z.string().trim()).nullable().optional(),
    validFrom: zod_1.z.string().datetime().optional(),
    validUntil: zod_1.z.string().datetime().optional(),
}).strict();
//# sourceMappingURL=coupon-management.validation.js.map