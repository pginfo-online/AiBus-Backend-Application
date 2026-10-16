"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCommissionRuleBodySchema = exports.createCommissionRuleBodySchema = exports.ruleIdParamsSchema = exports.listCommissionRulesQuerySchema = void 0;
const zod_1 = require("zod");
exports.listCommissionRulesQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    agentId: zod_1.z.string().uuid().optional(),
    operatorName: zod_1.z.string().optional(),
    isActive: zod_1.z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
});
exports.ruleIdParamsSchema = zod_1.z.object({
    ruleId: zod_1.z.string().uuid(),
});
exports.createCommissionRuleBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    ruleType: zod_1.z.enum([
        'FLAT_PERCENTAGE',
        'FLAT_AMOUNT',
        'TIERED_BOOKING',
        'OPERATOR_SPECIFIC',
        'ROUTE_SPECIFIC',
    ]),
    agentId: zod_1.z.string().uuid().nullable().optional(),
    operatorName: zod_1.z.string().max(100).nullable().optional(),
    fromCityId: zod_1.z.number().int().nullable().optional(),
    toCityId: zod_1.z.number().int().nullable().optional(),
    percentage: zod_1.z.number().min(0).max(100).nullable().optional(),
    flatAmount: zod_1.z.number().min(0).nullable().optional(),
    minFare: zod_1.z.number().min(0).nullable().optional(),
    maxCommission: zod_1.z.number().min(0).nullable().optional(),
    priority: zod_1.z.number().int().default(0),
    effectiveFrom: zod_1.z.coerce.date().optional(),
    effectiveUntil: zod_1.z.coerce.date().nullable().optional(),
});
exports.updateCommissionRuleBodySchema = exports.createCommissionRuleBodySchema.partial();
//# sourceMappingURL=commission-management.validation.js.map