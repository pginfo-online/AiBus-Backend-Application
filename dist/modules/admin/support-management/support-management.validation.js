"use strict";
// ---------------------------------------------------------------------------
// Admin Support Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicketReplyBodySchema = exports.updateTicketBodySchema = exports.createTicketBodySchema = exports.ticketIdParamsSchema = exports.listTicketsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listTicketsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    search: zod_1.z.string().trim().optional(),
    status: zod_1.z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'ESCALATED']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    category: zod_1.z.string().trim().optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
    userId: zod_1.z.string().uuid().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'priority', 'status', 'updatedAt']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.ticketIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid ticket ID'),
});
exports.createTicketBodySchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(),
    bookingId: zod_1.z.string().uuid().optional(),
    subject: zod_1.z.string().min(3).max(200).trim(),
    description: zod_1.z.string().min(5).max(5000).trim(),
    category: zod_1.z.enum(['BOOKING', 'PAYMENT', 'REFUND', 'CANCELLATION', 'GENERAL', 'OTHER']),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
    assignedTo: zod_1.z.string().uuid().optional(),
}).strict();
exports.updateTicketBodySchema = zod_1.z.object({
    status: zod_1.z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'ESCALATED']).optional(),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    category: zod_1.z.enum(['BOOKING', 'PAYMENT', 'REFUND', 'CANCELLATION', 'GENERAL', 'OTHER']).optional(),
    assignedTo: zod_1.z.string().uuid().nullable().optional(),
}).strict();
exports.createTicketReplyBodySchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(5000).trim(),
    isInternal: zod_1.z.boolean().optional().default(false),
}).strict();
//# sourceMappingURL=support-management.validation.js.map