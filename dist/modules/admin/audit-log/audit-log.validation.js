"use strict";
// ---------------------------------------------------------------------------
// Admin Audit Log — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAuditLogsQuerySchema = exports.auditLogIdParamsSchema = exports.listAuditLogsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    adminId: zod_1.z.string().uuid().optional(),
    module: zod_1.z.string().trim().optional(),
    action: zod_1.z.string().trim().optional(),
    resourceType: zod_1.z.string().trim().optional(),
    resourceId: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'module', 'action']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.auditLogIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid audit log ID'),
});
exports.exportAuditLogsQuerySchema = zod_1.z.object({
    adminId: zod_1.z.string().uuid().optional(),
    module: zod_1.z.string().trim().optional(),
    action: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    format: zod_1.z.enum(['csv', 'json']).optional().default('csv'),
}).strict();
//# sourceMappingURL=audit-log.validation.js.map