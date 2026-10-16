"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualAdjustmentBodySchema = exports.listLedgerQuerySchema = void 0;
const zod_1 = require("zod");
exports.listLedgerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    agentId: zod_1.z.string().uuid().optional(),
    bookingId: zod_1.z.string().uuid().optional(),
    type: zod_1.z
        .enum([
        'AGENT_WALLET_DEBIT',
        'AGENT_WALLET_CREDIT',
        'AGENT_WALLET_TOPUP',
        'COMMISSION_CREDIT',
        'COMMISSION_REVERSAL',
        'REFUND_CREDIT',
        'CONVENIENCE_FEE_DEBIT',
        'CREDIT_LIMIT_UTILIZATION',
        'CREDIT_LIMIT_RELEASE',
        'PLATFORM_REVENUE_CREDIT',
        'MANUAL_ADJUSTMENT',
    ])
        .optional(),
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
});
exports.manualAdjustmentBodySchema = zod_1.z.object({
    agentId: zod_1.z.string().uuid(),
    amount: zod_1.z.number().positive().max(1000000), // Max 10 lakh single adjustment
    direction: zod_1.z.enum(['CREDIT_AGENT', 'DEBIT_AGENT']),
    reason: zod_1.z.string().min(5).max(500),
    idempotencyKey: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=ledger-management.validation.js.map