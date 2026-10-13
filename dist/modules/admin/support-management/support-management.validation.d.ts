import { z } from 'zod';
export declare const listTicketsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        RESOLVED: "RESOLVED";
        OPEN: "OPEN";
        IN_PROGRESS: "IN_PROGRESS";
        AWAITING_CUSTOMER: "AWAITING_CUSTOMER";
        CLOSED: "CLOSED";
        ESCALATED: "ESCALATED";
    }>>;
    priority: z.ZodOptional<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        URGENT: "URGENT";
    }>>;
    category: z.ZodOptional<z.ZodString>;
    assignedTo: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        status: "status";
        createdAt: "createdAt";
        updatedAt: "updatedAt";
        priority: "priority";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strict>;
export declare const ticketIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createTicketBodySchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    bookingId: z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<{
        REFUND: "REFUND";
        BOOKING: "BOOKING";
        PAYMENT: "PAYMENT";
        CANCELLATION: "CANCELLATION";
        GENERAL: "GENERAL";
        OTHER: "OTHER";
    }>;
    priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        URGENT: "URGENT";
    }>>>;
    assignedTo: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const updateTicketBodySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        RESOLVED: "RESOLVED";
        OPEN: "OPEN";
        IN_PROGRESS: "IN_PROGRESS";
        AWAITING_CUSTOMER: "AWAITING_CUSTOMER";
        CLOSED: "CLOSED";
        ESCALATED: "ESCALATED";
    }>>;
    priority: z.ZodOptional<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
        URGENT: "URGENT";
    }>>;
    category: z.ZodOptional<z.ZodEnum<{
        REFUND: "REFUND";
        BOOKING: "BOOKING";
        PAYMENT: "PAYMENT";
        CANCELLATION: "CANCELLATION";
        GENERAL: "GENERAL";
        OTHER: "OTHER";
    }>>;
    assignedTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strict>;
export declare const createTicketReplyBodySchema: z.ZodObject<{
    message: z.ZodString;
    isInternal: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketBodySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketBodySchema>;
export type CreateTicketReplyInput = z.infer<typeof createTicketReplyBodySchema>;
//# sourceMappingURL=support-management.validation.d.ts.map