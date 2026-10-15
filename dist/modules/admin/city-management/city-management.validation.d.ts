import { z } from 'zod';
export declare const listCitiesQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    search: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    active: z.ZodPipe<z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>, z.ZodTransform<boolean | undefined, "true" | "false" | undefined>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        name: "name";
        createdAt: "createdAt";
        state: "state";
        active: "active";
    }>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        desc: "desc";
        asc: "asc";
    }>>>;
}, z.core.$strict>;
export declare const cityIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createCityBodySchema: z.ZodObject<{
    name: z.ZodString;
    state: z.ZodOptional<z.ZodString>;
    providerCityId: z.ZodOptional<z.ZodNumber>;
    providerName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    aliases: z.ZodOptional<z.ZodArray<z.ZodString>>;
    active: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strict>;
export declare const updateCityBodySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    providerCityId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    providerName: z.ZodOptional<z.ZodString>;
    aliases: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    active: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;
export type CreateCityInput = z.infer<typeof createCityBodySchema>;
export type UpdateCityInput = z.infer<typeof updateCityBodySchema>;
//# sourceMappingURL=city-management.validation.d.ts.map