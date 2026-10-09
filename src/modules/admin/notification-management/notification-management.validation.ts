// ---------------------------------------------------------------------------
// Admin Notification Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']).optional(),
  type: z.enum([
    'BOOKING_CONFIRMATION',
    'BOOKING_CANCELLATION',
    'REFUND_PROCESSED',
    'PAYMENT_REMINDER',
    'TRIP_REMINDER',
  ]).optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  userId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'sentAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export const broadcastNotificationBodySchema = z.object({
  channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']),
  type: z.enum([
    'BOOKING_CONFIRMATION',
    'BOOKING_CANCELLATION',
    'REFUND_PROCESSED',
    'PAYMENT_REMINDER',
    'TRIP_REMINDER',
  ]).optional().default('TRIP_REMINDER'),
  title: z.string().min(2).max(200).trim(),
  message: z.string().min(5).max(2000).trim(),
  targetRole: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
  targetUserIds: z.array(z.string().uuid()).max(1000).optional(),
}).strict().refine((data) => data.targetRole !== undefined || (data.targetUserIds && data.targetUserIds.length > 0), {
  message: 'Either targetRole or targetUserIds must be provided',
  path: ['targetRole'],
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationBodySchema>;
