import { z } from 'zod';
export declare const reportQuerySchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    operatorName: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    format: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        csv: "csv";
        json: "json";
    }>>>;
}, z.core.$strict>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
//# sourceMappingURL=report.validation.d.ts.map