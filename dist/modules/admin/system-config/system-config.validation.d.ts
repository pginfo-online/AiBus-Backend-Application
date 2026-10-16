import { z } from 'zod';
export declare const listConfigQuerySchema: z.ZodObject<{
    group: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const configKeyParamsSchema: z.ZodObject<{
    key: z.ZodString;
}, z.core.$strip>;
export declare const createConfigBodySchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodString;
    type: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        STRING: "STRING";
        NUMBER: "NUMBER";
        BOOLEAN: "BOOLEAN";
        JSON: "JSON";
    }>>>;
    description: z.ZodOptional<z.ZodString>;
    group: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    isSecret: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export declare const updateConfigBodySchema: z.ZodObject<{
    value: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    isSecret: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const createFeatureFlagBodySchema: z.ZodObject<{
    key: z.ZodString;
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    description: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strict>;
export declare const toggleFeatureFlagBodySchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strict>;
export type ListConfigQuery = z.infer<typeof listConfigQuerySchema>;
export type CreateConfigInput = z.infer<typeof createConfigBodySchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigBodySchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagBodySchema>;
export type ToggleFeatureFlagInput = z.infer<typeof toggleFeatureFlagBodySchema>;
//# sourceMappingURL=system-config.validation.d.ts.map