import { z } from 'zod';
export declare const searchBusesSchema: z.ZodObject<{
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    journeyDate: z.ZodString;
    isAC: z.ZodOptional<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>>;
    isSleeper: z.ZodOptional<z.ZodPipe<z.ZodEnum<{
        true: "true";
        false: "false";
    }>, z.ZodTransform<boolean, "true" | "false">>>;
    operator: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodEnum<{
        fare_asc: "fare_asc";
        fare_desc: "fare_desc";
        departure_asc: "departure_asc";
        departure_desc: "departure_desc";
        duration_asc: "duration_asc";
    }>>;
    minFare: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    maxFare: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type SearchBusesQuery = z.infer<typeof searchBusesSchema>;
export declare const searchSingleBusSchema: z.ZodObject<{
    fromCityId: z.ZodCoercedNumber<unknown>;
    toCityId: z.ZodCoercedNumber<unknown>;
    journeyDate: z.ZodString;
    busId: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export type SearchSingleBusQuery = z.infer<typeof searchSingleBusSchema>;
//# sourceMappingURL=search.validation.d.ts.map