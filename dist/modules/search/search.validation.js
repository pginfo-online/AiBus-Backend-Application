"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSingleBusSchema = exports.searchBusesSchema = void 0;
const zod_1 = require("zod");
exports.searchBusesSchema = zod_1.z.object({
    fromCityId: zod_1.z.coerce.number().int().positive('fromCityId is required'),
    toCityId: zod_1.z.coerce.number().int().positive('toCityId is required'),
    journeyDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be in YYYY-MM-DD format')
        .refine((dateStr) => {
        const today = new Date().toISOString().slice(0, 10);
        return dateStr >= today;
    }, 'journeyDate cannot be in the past'),
    isAC: zod_1.z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
    isSleeper: zod_1.z
        .enum(['true', 'false'])
        .transform((val) => val === 'true')
        .optional(),
    operator: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['fare_asc', 'fare_desc', 'departure_asc', 'departure_desc', 'duration_asc']).optional(),
    minFare: zod_1.z.coerce.number().nonnegative().optional(),
    maxFare: zod_1.z.coerce.number().positive().optional(),
});
exports.searchSingleBusSchema = zod_1.z.object({
    fromCityId: zod_1.z.coerce.number().int().positive('fromCityId is required'),
    toCityId: zod_1.z.coerce.number().int().positive('toCityId is required'),
    journeyDate: zod_1.z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be in YYYY-MM-DD format'),
    busId: zod_1.z.coerce.number().int().positive('busId is required'),
});
//# sourceMappingURL=search.validation.js.map