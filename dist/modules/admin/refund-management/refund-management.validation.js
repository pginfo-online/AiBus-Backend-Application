"use strict";
// ---------------------------------------------------------------------------
// Admin Refund Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRefundBodySchema = exports.refundIdParamsSchema = exports.listRefundsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listRefundsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    status: zod_1.z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
    destination: zod_1.z.enum(['ORIGINAL_PAYMENT_METHOD', 'WALLET']).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.refundIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid refund ID'),
});
exports.processRefundBodySchema = zod_1.z.object({
    notes: zod_1.z.string().max(500).optional(),
}).strict();
//# sourceMappingURL=refund-management.validation.js.map