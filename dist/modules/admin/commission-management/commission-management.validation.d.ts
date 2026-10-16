import { z } from 'zod';
export declare const listCommissionRulesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    agentId: z.ZodOptional<z.ZodString>;
    operatorName: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>>;
}, z.core.$strip>;
export type ListCommissionRulesQuery = z.infer<typeof listCommissionRulesQuerySchema>;
export declare const ruleIdParamsSchema: z.ZodObject<{
    ruleId: z.ZodString;
}, z.core.$strip>;
export type RuleIdParams = z.infer<typeof ruleIdParamsSchema>;
export declare const createCommissionRuleBodySchema: z.ZodObject<{
    name: z.ZodString;
    ruleType: z.ZodEnum<{
        FLAT_PERCENTAGE: "FLAT_PERCENTAGE";
        FLAT_AMOUNT: "FLAT_AMOUNT";
        TIERED_BOOKING: "TIERED_BOOKING";
        OPERATOR_SPECIFIC: "OPERATOR_SPECIFIC";
        ROUTE_SPECIFIC: "ROUTE_SPECIFIC";
    }>;
    agentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    operatorName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    fromCityId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    toCityId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    percentage: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    flatAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    minFare: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    maxCommission: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    priority: z.ZodDefault<z.ZodNumber>;
    effectiveFrom: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    effectiveUntil: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export type CreateCommissionRuleBody = z.infer<typeof createCommissionRuleBodySchema>;
export declare const updateCommissionRuleBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    ruleType: z.ZodOptional<z.ZodEnum<{
        FLAT_PERCENTAGE: "FLAT_PERCENTAGE";
        FLAT_AMOUNT: "FLAT_AMOUNT";
        TIERED_BOOKING: "TIERED_BOOKING";
        OPERATOR_SPECIFIC: "OPERATOR_SPECIFIC";
        ROUTE_SPECIFIC: "ROUTE_SPECIFIC";
    }>>;
    agentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    operatorName: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    fromCityId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    toCityId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    percentage: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    flatAmount: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    minFare: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    maxCommission: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    priority: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    effectiveFrom: z.ZodOptional<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    effectiveUntil: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>>;
}, z.core.$strip>;
export type UpdateCommissionRuleBody = z.infer<typeof updateCommissionRuleBodySchema>;
//# sourceMappingURL=commission-management.validation.d.ts.map