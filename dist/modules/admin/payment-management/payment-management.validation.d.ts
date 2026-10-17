import { z } from 'zod';
export declare const listPaymentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        REFUND_PENDING: "REFUND_PENDING";
        REFUNDED: "REFUNDED";
        PENDING: "PENDING";
        PROCESSING: "PROCESSING";
        SUCCESS: "SUCCESS";
        FAILED: "FAILED";
        PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED";
    }>>;
    gateway: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        status: "status";
        createdAt: "createdAt";
        amount: "amount";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strict>;
export declare const paymentIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
//# sourceMappingURL=payment-management.validation.d.ts.map