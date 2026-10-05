import { z } from 'zod';
import { passengerHoldSchema } from '../holds/holds.validation';

export const createBookingSchema = z.object({
  holdId: z.string().uuid('Valid holdId is required'),
  fromCityId: z.coerce.number().int().positive(),
  toCityId: z.coerce.number().int().positive(),
  fromCityName: z.string().min(1),
  toCityName: z.string().min(1),
  journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  busId: z.coerce.number().int().positive(),
  tripId: z.string().min(1),
  pickupCode: z.string().min(1),
  pickupLocation: z.string().min(1),
  pickupTime: z.string().min(1),
  dropoffCode: z.string().min(1),
  dropoffLocation: z.string().min(1),
  dropoffTime: z.string().min(1),
  operatorName: z.string().min(1),
  busType: z.string().min(1),
  totalFare: z.coerce.number().positive(),
  baseFare: z.coerce.number().positive(),
  serviceTax: z.coerce.number().nonnegative(),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  passengers: z.array(passengerHoldSchema).min(1).max(6),
  cancellationPolicy: z.any().optional(),
});

export const cancelBookingSchema = z.object({
  seatNos: z.array(z.string().min(1)).min(1, 'At least one seat number is required'),
  reason: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
