"use strict";
// ---------------------------------------------------------------------------
// Admin Payment Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentIdParamsSchema = exports.listPaymentsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listPaymentsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUND_PENDING', 'REFUNDED', 'PARTIALLY_REFUNDED']).optional(),
    gateway: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.paymentIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid payment ID'),
});
//# sourceMappingURL=payment-management.validation.js.map