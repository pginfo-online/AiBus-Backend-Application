import { z } from 'zod';
export declare const listAuditLogsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    adminId: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    resourceType: z.ZodOptional<z.ZodString>;
    resourceId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        module: "module";
        createdAt: "createdAt";
        action: "action";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
}, z.core.$strict>;
export declare const auditLogIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const exportAuditLogsQuerySchema: z.ZodObject<{
    adminId: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        csv: "csv";
        json: "json";
    }>>>;
}, z.core.$strict>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
//# sourceMappingURL=audit-log.validation.d.ts.map