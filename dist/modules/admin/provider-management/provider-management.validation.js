"use strict";
// ---------------------------------------------------------------------------
// Admin Provider Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionIdParamsSchema = exports.providerNameParamsSchema = exports.listProviderTransactionsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listProviderTransactionsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    providerName: zod_1.z.string().trim().optional(),
    operation: zod_1.z.string().trim().optional(),
    bookingId: zod_1.z.string().uuid().optional(),
    responseStatus: zod_1.z.coerce.number().int().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'durationMs', 'responseStatus']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.providerNameParamsSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).trim(),
});
exports.transactionIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid transaction ID'),
});
//# sourceMappingURL=provider-management.validation.js.map