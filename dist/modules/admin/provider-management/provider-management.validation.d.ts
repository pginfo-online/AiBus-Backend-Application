import { z } from 'zod';
export declare const listProviderTransactionsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    providerName: z.ZodOptional<z.ZodString>;
    operation: z.ZodOptional<z.ZodString>;
    bookingId: z.ZodOptional<z.ZodString>;
    responseStatus: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        createdAt: "createdAt";
        responseStatus: "responseStatus";
        durationMs: "durationMs";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
}, z.core.$strict>;
export declare const providerNameParamsSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export declare const transactionIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type ListProviderTransactionsQuery = z.infer<typeof listProviderTransactionsQuerySchema>;
//# sourceMappingURL=provider-management.validation.d.ts.map