"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponCodeParamSchema = exports.validateCouponSchema = exports.listCouponsQuerySchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.listCouponsQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(client_1.CouponType).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
exports.validateCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Coupon code is required').trim().toUpperCase(),
    totalFare: zod_1.z.coerce.number().positive('Total fare must be greater than 0'),
    operatorName: zod_1.z.string().optional(),
    fromCityId: zod_1.z.coerce.number().int().optional(),
    toCityId: zod_1.z.coerce.number().int().optional(),
    busId: zod_1.z.coerce.number().int().optional(),
    userId: zod_1.z.string().uuid().optional(),
});
exports.couponCodeParamSchema = zod_1.z.object({
    code: zod_1.z.string().min(1).trim().toUpperCase(),
});
//# sourceMappingURL=coupons.validation.js.map