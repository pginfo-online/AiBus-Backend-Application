import { z } from 'zod';
export declare const listRefundsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        PROCESSING: "PROCESSING";
        FAILED: "FAILED";
        COMPLETED: "COMPLETED";
        REVERSED: "REVERSED";
    }>>;
    destination: z.ZodOptional<z.ZodEnum<{
        ORIGINAL_PAYMENT_METHOD: "ORIGINAL_PAYMENT_METHOD";
        WALLET: "WALLET";
    }>>;
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
export declare const refundIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const processRefundBodySchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>;
//# sourceMappingURL=refund-management.validation.d.ts.map