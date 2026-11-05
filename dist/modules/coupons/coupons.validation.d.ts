import { z } from 'zod';
export declare const listCouponsQuerySchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        PERCENTAGE: "PERCENTAGE";
        FLAT: "FLAT";
        CASHBACK: "CASHBACK";
    }>>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const validateCouponSchema: z.ZodObject<{
    code: z.ZodString;
    totalFare: z.ZodCoercedNumber<unknown>;
    operatorName: z.ZodOptional<z.ZodString>;
    fromCityId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    toCityId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    busId: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const couponCodeParamSchema: z.ZodObject<{
    code: z.ZodString;
}, z.core.$strip>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CouponCodeParam = z.infer<typeof couponCodeParamSchema>;
//# sourceMappingURL=coupons.validation.d.ts.map