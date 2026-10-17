import { z } from 'zod';
export declare const listNotificationsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    channel: z.ZodOptional<z.ZodEnum<{
        EMAIL: "EMAIL";
        SMS: "SMS";
        PUSH: "PUSH";
        WHATSAPP: "WHATSAPP";
    }>>;
    type: z.ZodOptional<z.ZodEnum<{
        BOOKING_CONFIRMATION: "BOOKING_CONFIRMATION";
        BOOKING_CANCELLATION: "BOOKING_CANCELLATION";
        REFUND_PROCESSED: "REFUND_PROCESSED";
        PAYMENT_REMINDER: "PAYMENT_REMINDER";
        TRIP_REMINDER: "TRIP_REMINDER";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        FAILED: "FAILED";
        SENT: "SENT";
    }>>;
    userId: z.ZodOptional<z.ZodString>;
    bookingId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        status: "status";
        createdAt: "createdAt";
        sentAt: "sentAt";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strict>;
export declare const notificationIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const broadcastNotificationBodySchema: z.ZodObject<{
    channel: z.ZodEnum<{
        EMAIL: "EMAIL";
        SMS: "SMS";
        PUSH: "PUSH";
        WHATSAPP: "WHATSAPP";
    }>;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        BOOKING_CONFIRMATION: "BOOKING_CONFIRMATION";
        BOOKING_CANCELLATION: "BOOKING_CANCELLATION";
        REFUND_PROCESSED: "REFUND_PROCESSED";
        PAYMENT_REMINDER: "PAYMENT_REMINDER";
        TRIP_REMINDER: "TRIP_REMINDER";
    }>>>;
    title: z.ZodString;
    message: z.ZodString;
    targetRole: z.ZodOptional<z.ZodEnum<{
        CUSTOMER: "CUSTOMER";
        OPERATOR_AGENT: "OPERATOR_AGENT";
        SUPPORT_AGENT: "SUPPORT_AGENT";
        ADMIN: "ADMIN";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>;
    targetUserIds: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationBodySchema>;
//# sourceMappingURL=notification-management.validation.d.ts.map