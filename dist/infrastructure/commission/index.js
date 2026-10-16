"use strict";
// ---------------------------------------------------------------------------
// CommissionEngine — Priority-Ordered Rule Resolution
// ---------------------------------------------------------------------------
// Resolution order (highest priority wins):
//   1. Agent-specific + route-specific rule
//   2. Agent-specific + operator-specific rule
//   3. Agent-specific + flat percentage/amount rule
//   4. Global route-specific rule
//   5. Global operator-specific rule
//   6. Global flat percentage/amount rule (default)
//
// If no rule matches, commission = 0 (logged as warning).
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCommission = resolveCommission;
const database_1 = require("../database");
const logger_1 = require("../logger");
const commissionLogger = logger_1.logger.child({ module: 'commission-engine' });
/**
 * Resolves the applicable commission rule for a booking and computes amounts.
 * Returns commissionAmt=0 if no rule is active (log warning, not error).
 */
async function resolveCommission(input) {
    const prisma = (0, database_1.getPrismaClient)();
    const now = new Date();
    // Fetch all candidate rules: agent-specific OR global, currently active
    const rules = await prisma.commissionRule.findMany({
        where: {
            isActive: true,
            effectiveFrom: { lte: now },
            AND: [
                {
                    OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: now } }],
                },
                {
                    OR: [
                        { agentId: input.agentId },
                        { agentId: null }, // global rules
                    ],
                },
            ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    // Find best matching rule using priority ordering
    const matched = rules.find((rule) => {
        const isAgentSpecific = rule.agentId === input.agentId || rule.agentId === null;
        if (!isAgentSpecific)
            return false;
        // Check route specificity
        if (rule.fromCityId !== null && rule.fromCityId !== input.fromCityId)
            return false;
        if (rule.toCityId !== null && rule.toCityId !== input.toCityId)
            return false;
        // Check operator specificity
        if (rule.operatorName !== null && rule.operatorName !== input.operatorName)
            return false;
        // Check fare floor
        if (rule.minFare !== null && input.grossFare < Number(rule.minFare))
            return false;
        return true;
    });
    if (!matched) {
        commissionLogger.warn({ agentId: input.agentId, fromCityId: input.fromCityId, toCityId: input.toCityId }, 'No commission rule matched — commission will be 0');
        return {
            ruleId: null,
            ruleSnapshot: { note: 'no_rule_matched' },
            grossFare: input.grossFare,
            baseFareForCommission: input.baseFare,
            commissionRate: 0,
            commissionAmt: 0,
            netFare: input.grossFare,
        };
    }
    let commissionAmt = 0;
    const base = input.baseFare; // Always tax-excluded base for commission calculation
    if (matched.percentage !== null && Number(matched.percentage) > 0) {
        commissionAmt = (base * Number(matched.percentage)) / 100;
    }
    else if (matched.flatAmount !== null && Number(matched.flatAmount) > 0) {
        commissionAmt = Number(matched.flatAmount);
    }
    // Apply cap if configured
    if (matched.maxCommission !== null && commissionAmt > Number(matched.maxCommission)) {
        commissionAmt = Number(matched.maxCommission);
    }
    commissionAmt = Math.round(commissionAmt * 100) / 100; // Round to 2dp
    const netFare = Math.max(0, input.grossFare - commissionAmt);
    commissionLogger.info({
        agentId: input.agentId,
        ruleId: matched.id,
        ruleType: matched.ruleType,
        grossFare: input.grossFare,
        baseFare: base,
        commissionAmt,
        netFare,
    }, 'Commission resolved');
    return {
        ruleId: matched.id,
        ruleSnapshot: {
            id: matched.id,
            name: matched.name,
            ruleType: matched.ruleType,
            percentage: matched.percentage ? Number(matched.percentage) : null,
            flatAmount: matched.flatAmount ? Number(matched.flatAmount) : null,
            maxCommission: matched.maxCommission ? Number(matched.maxCommission) : null,
            priority: matched.priority,
            effectiveFrom: matched.effectiveFrom,
            effectiveUntil: matched.effectiveUntil,
        },
        grossFare: input.grossFare,
        baseFareForCommission: base,
        commissionRate: matched.percentage ? Number(matched.percentage) : 0,
        commissionAmt,
        netFare,
    };
}
//# sourceMappingURL=index.js.map