import { z } from 'zod';

export const listCommissionRulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentId: z.string().uuid().optional(),
  operatorName: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

export type ListCommissionRulesQuery = z.infer<typeof listCommissionRulesQuerySchema>;

export const ruleIdParamsSchema = z.object({
  ruleId: z.string().uuid(),
});

export type RuleIdParams = z.infer<typeof ruleIdParamsSchema>;

export const createCommissionRuleBodySchema = z.object({
  name: z.string().min(2).max(100),
  ruleType: z.enum([
    'FLAT_PERCENTAGE',
    'FLAT_AMOUNT',
    'TIERED_BOOKING',
    'OPERATOR_SPECIFIC',
    'ROUTE_SPECIFIC',
  ]),
  agentId: z.string().uuid().nullable().optional(),
  operatorName: z.string().max(100).nullable().optional(),
  fromCityId: z.number().int().nullable().optional(),
  toCityId: z.number().int().nullable().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  flatAmount: z.number().min(0).nullable().optional(),
  minFare: z.number().min(0).nullable().optional(),
  maxCommission: z.number().min(0).nullable().optional(),
  priority: z.number().int().default(0),
  effectiveFrom: z.coerce.date().optional(),
  effectiveUntil: z.coerce.date().nullable().optional(),
});

export type CreateCommissionRuleBody = z.infer<typeof createCommissionRuleBodySchema>;

export const updateCommissionRuleBodySchema = createCommissionRuleBodySchema.partial();

export type UpdateCommissionRuleBody = z.infer<typeof updateCommissionRuleBodySchema>;
