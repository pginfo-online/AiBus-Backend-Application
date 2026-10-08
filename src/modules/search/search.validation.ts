import { z } from 'zod';

export const searchBusesSchema = z.object({
  fromCityId: z.coerce.number().int().positive('fromCityId is required'),
  toCityId: z.coerce.number().int().positive('toCityId is required'),
  journeyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be in YYYY-MM-DD format')
    .refine((dateStr) => {
      const today = new Date().toISOString().slice(0, 10);
      return dateStr >= today;
    }, 'journeyDate cannot be in the past'),
  isAC: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  isSleeper: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  operator: z.string().optional(),
  sortBy: z.enum(['fare_asc', 'fare_desc', 'departure_asc', 'departure_desc', 'duration_asc']).optional(),
  minFare: z.coerce.number().nonnegative().optional(),
  maxFare: z.coerce.number().positive().optional(),
});

export type SearchBusesQuery = z.infer<typeof searchBusesSchema>;

export const searchSingleBusSchema = z.object({
  fromCityId: z.coerce.number().int().positive('fromCityId is required'),
  toCityId: z.coerce.number().int().positive('toCityId is required'),
  journeyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be in YYYY-MM-DD format'),
  busId: z.coerce.number().int().positive('busId is required'),
});

export type SearchSingleBusQuery = z.infer<typeof searchSingleBusSchema>;
