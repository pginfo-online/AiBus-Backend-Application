"use strict";
// ---------------------------------------------------------------------------
// Admin Notification Management — Validation Schemas
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastNotificationBodySchema = exports.notificationIdParamsSchema = exports.listNotificationsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listNotificationsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
    channel: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']).optional(),
    type: zod_1.z.enum([
        'BOOKING_CONFIRMATION',
        'BOOKING_CANCELLATION',
        'REFUND_PROCESSED',
        'PAYMENT_REMINDER',
        'TRIP_REMINDER',
    ]).optional(),
    status: zod_1.z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
    userId: zod_1.z.string().uuid().optional(),
    bookingId: zod_1.z.string().uuid().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'sentAt', 'status']).optional().default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();
exports.notificationIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid notification ID'),
});
exports.broadcastNotificationBodySchema = zod_1.z.object({
    channel: zod_1.z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']),
    type: zod_1.z.enum([
        'BOOKING_CONFIRMATION',
        'BOOKING_CANCELLATION',
        'REFUND_PROCESSED',
        'PAYMENT_REMINDER',
        'TRIP_REMINDER',
    ]).optional().default('TRIP_REMINDER'),
    title: zod_1.z.string().min(2).max(200).trim(),
    message: zod_1.z.string().min(5).max(2000).trim(),
    targetRole: zod_1.z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
    targetUserIds: zod_1.z.array(zod_1.z.string().uuid()).max(1000).optional(),
}).strict().refine((data) => data.targetRole !== undefined || (data.targetUserIds && data.targetUserIds.length > 0), {
    message: 'Either targetRole or targetUserIds must be provided',
    path: ['targetRole'],
});
//# sourceMappingURL=notification-management.validation.js.map