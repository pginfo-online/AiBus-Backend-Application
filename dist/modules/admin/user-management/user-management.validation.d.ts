import { z } from 'zod';
export declare const listUsersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        CUSTOMER: "CUSTOMER";
        OPERATOR_AGENT: "OPERATOR_AGENT";
        SUPPORT_AGENT: "SUPPORT_AGENT";
        ADMIN: "ADMIN";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        DEACTIVATED: "DEACTIVATED";
    }>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        email: "email";
        firstName: "firstName";
        lastName: "lastName";
        role: "role";
        status: "status";
        createdAt: "createdAt";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const userIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const updateUserBodySchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        CUSTOMER: "CUSTOMER";
        OPERATOR_AGENT: "OPERATOR_AGENT";
        SUPPORT_AGENT: "SUPPORT_AGENT";
        ADMIN: "ADMIN";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        SUSPENDED: "SUSPENDED";
        DEACTIVATED: "DEACTIVATED";
    }>>;
}, z.core.$strict>;
export declare const suspendUserBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strict>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type SuspendUserBody = z.infer<typeof suspendUserBodySchema>;
//# sourceMappingURL=user-management.validation.d.ts.map