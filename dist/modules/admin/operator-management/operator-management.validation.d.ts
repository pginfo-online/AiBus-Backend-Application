import { z } from 'zod';
export declare const listOperatorsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        DEACTIVATED: "DEACTIVATED";
        PENDING_REVIEW: "PENDING_REVIEW";
    }>>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        name: "name";
        createdAt: "createdAt";
        code: "code";
        totalBookings: "totalBookings";
        totalRevenue: "totalRevenue";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
}, z.core.$strict>;
export declare const operatorIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createOperatorBodySchema: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    contactEmail: z.ZodString;
    contactPhone: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        DEACTIVATED: "DEACTIVATED";
        PENDING_REVIEW: "PENDING_REVIEW";
    }>>>;
    providerName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    providerOperatorId: z.ZodOptional<z.ZodString>;
    commissionPct: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    gstNumber: z.ZodOptional<z.ZodString>;
    panNumber: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strict>;
export declare const updateOperatorBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    contactEmail: z.ZodOptional<z.ZodString>;
    contactPhone: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        DEACTIVATED: "DEACTIVATED";
        PENDING_REVIEW: "PENDING_REVIEW";
    }>>;
    providerName: z.ZodOptional<z.ZodString>;
    providerOperatorId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    commissionPct: z.ZodOptional<z.ZodNumber>;
    gstNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    panNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    state: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodAny>>>;
}, z.core.$strict>;
export declare const suspendOperatorBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type ListOperatorsQuery = z.infer<typeof listOperatorsQuerySchema>;
export type CreateOperatorInput = z.infer<typeof createOperatorBodySchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorBodySchema>;
//# sourceMappingURL=operator-management.validation.d.ts.map