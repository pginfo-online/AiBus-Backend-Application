"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCreditLimitBodySchema = exports.suspendAgentBodySchema = exports.kycReviewBodySchema = exports.agentIdParamsSchema = exports.listAgentsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAgentsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z
        .enum([
        'PENDING_KYC',
        'KYC_SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'SUSPENDED',
    ])
        .optional(),
    city: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
});
exports.agentIdParamsSchema = zod_1.z.object({
    agentId: zod_1.z.string().uuid(),
});
exports.kycReviewBodySchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT']),
    rejectionReason: zod_1.z.string().min(3).max(500).optional(),
});
exports.suspendAgentBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(500),
});
exports.updateCreditLimitBodySchema = zod_1.z.object({
    creditLimit: zod_1.z.number().min(0).max(10000000), // Max 1 crore INR
});
//# sourceMappingURL=agent-management.validation.js.map