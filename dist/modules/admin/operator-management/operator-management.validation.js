"use strict";
// ---------------------------------------------------------------------------
// Admin Operator Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendOperatorBodySchema = exports.updateOperatorBodySchema = exports.createOperatorBodySchema = exports.operatorIdParamsSchema = exports.listOperatorsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listOperatorsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().trim().optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional(),
    city: zod_1.z.string().trim().optional(),
    state: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(['name', 'code', 'totalBookings', 'totalRevenue', 'createdAt']).optional().default('name'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc'),
}).strict();
exports.operatorIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid operator ID'),
});
exports.createOperatorBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).trim(),
    code: zod_1.z.string().min(2).max(30).trim().toUpperCase(),
    contactEmail: zod_1.z.string().email().trim(),
    contactPhone: zod_1.z.string().min(8).max(20).trim(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional().default('ACTIVE'),
    providerName: zod_1.z.string().max(50).optional().default('GDS'),
    providerOperatorId: zod_1.z.string().optional(),
    commissionPct: zod_1.z.number().min(0).max(100).optional().default(0),
    gstNumber: zod_1.z.string().max(30).optional(),
    panNumber: zod_1.z.string().max(20).optional(),
    address: zod_1.z.string().max(250).optional(),
    city: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
}).strict();
exports.updateOperatorBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(150).trim().optional(),
    code: zod_1.z.string().min(2).max(30).trim().toUpperCase().optional(),
    contactEmail: zod_1.z.string().email().trim().optional(),
    contactPhone: zod_1.z.string().min(8).max(20).trim().optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW', 'DEACTIVATED']).optional(),
    providerName: zod_1.z.string().max(50).optional(),
    providerOperatorId: zod_1.z.string().nullable().optional(),
    commissionPct: zod_1.z.number().min(0).max(100).optional(),
    gstNumber: zod_1.z.string().max(30).nullable().optional(),
    panNumber: zod_1.z.string().max(20).nullable().optional(),
    address: zod_1.z.string().max(250).nullable().optional(),
    city: zod_1.z.string().max(100).nullable().optional(),
    state: zod_1.z.string().max(100).nullable().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).nullable().optional(),
}).strict();
exports.suspendOperatorBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).max(500),
}).strict();
//# sourceMappingURL=operator-management.validation.js.map