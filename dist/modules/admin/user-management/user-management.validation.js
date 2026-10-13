"use strict";
// ---------------------------------------------------------------------------
// Admin User Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspendUserBodySchema = exports.updateUserBodySchema = exports.userIdParamsSchema = exports.listUsersQuerySchema = void 0;
const zod_1 = require("zod");
exports.listUsersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().optional(),
    role: zod_1.z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
    sortBy: zod_1.z.enum(['createdAt', 'firstName', 'lastName', 'email', 'role', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
}).strict();
exports.userIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid user ID'),
});
exports.updateUserBodySchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(50).optional(),
    lastName: zod_1.z.string().min(1).max(50).optional(),
    phone: zod_1.z.string().min(10).max(15).optional(),
    role: zod_1.z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
    status: zod_1.z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
});
exports.suspendUserBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(500),
}).strict();
//# sourceMappingURL=user-management.validation.js.map