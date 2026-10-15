import { z } from 'zod';
export declare const listCouponsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        PERCENTAGE: "PERCENTAGE";
        FLAT: "FLAT";
        CASHBACK: "CASHBACK";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        EXPIRED: "EXPIRED";
        EXHAUSTED: "EXHAUSTED";
        DISABLED: "DISABLED";
    }>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        createdAt: "createdAt";
        code: "code";
        usedCount: "usedCount";
        validUntil: "validUntil";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
}, z.core.$strict>;
export declare const couponIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createCouponBodySchema: z.ZodObject<{
    code: z.ZodString;
    type: z.ZodEnum<{
        PERCENTAGE: "PERCENTAGE";
        FLAT: "FLAT";
        CASHBACK: "CASHBACK";
    }>;
    value: z.ZodNumber;
    maxDiscount: z.ZodOptional<z.ZodNumber>;
    minOrderValue: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        EXPIRED: "EXPIRED";
        EXHAUSTED: "EXHAUSTED";
        DISABLED: "DISABLED";
    }>>>;
    description: z.ZodOptional<z.ZodString>;
    termsAndConditions: z.ZodOptional<z.ZodString>;
    usageLimit: z.ZodOptional<z.ZodNumber>;
    usageLimitPerUser: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    applicableRoutes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    applicableOperators: z.ZodOptional<z.ZodArray<z.ZodString>>;
    validFrom: z.ZodString;
    validUntil: z.ZodString;
}, z.core.$strict>;
export declare const updateCouponBodySchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        PERCENTAGE: "PERCENTAGE";
        FLAT: "FLAT";
        CASHBACK: "CASHBACK";
    }>>;
    value: z.ZodOptional<z.ZodNumber>;
    maxDiscount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    minOrderValue: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        EXPIRED: "EXPIRED";
        EXHAUSTED: "EXHAUSTED";
        DISABLED: "DISABLED";
    }>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    termsAndConditions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    usageLimit: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    usageLimitPerUser: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    applicableRoutes: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    applicableOperators: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type CreateCouponInput = z.infer<typeof createCouponBodySchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponBodySchema>;
//# sourceMappingURL=coupon-management.validation.d.ts.map