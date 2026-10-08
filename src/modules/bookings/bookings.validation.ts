import { z } from 'zod';
import { passengerHoldSchema } from '../holds/holds.validation';

export const createBookingSchema = z.object({
  holdId: z.string().optional().nullable(),
  fromCityId: z.coerce.number().int().nonnegative(),
  toCityId: z.coerce.number().int().nonnegative(),
  fromCityName: z.string().min(1).default('Bengaluru'),
  toCityName: z.string().min(1).default('Chennai'),
  journeyDate: z.string().min(1).transform((val) => (val.includes('T') ? val.split('T')[0] : val)),
  busId: z.coerce.number().int().nonnegative(),
  tripId: z.coerce.string().min(1),
  pickupCode: z.coerce.string().min(1).default('1'),
  pickupLocation: z.string().min(1).default('Boarding Point'),
  pickupTime: z.string().min(1).default('08:00'),
  dropoffCode: z.coerce.string().min(1).default('1'),
  dropoffLocation: z.string().min(1).default('Dropping Point'),
  dropoffTime: z.string().min(1).default('14:00'),
  operatorName: z.string().min(1).default('Bus Operator'),
  busType: z.string().min(1).default('AC Seater/Sleeper'),
  totalFare: z.coerce.number().nonnegative(),
  baseFare: z.coerce.number().nonnegative(),
  serviceTax: z.coerce.number().nonnegative().default(0),
  contactName: z.string().min(1).default('Passenger'),
  contactEmail: z.string().email().or(z.string().min(1)).default('booking@aibus.in'),
  contactPhone: z.string().min(1).default('9876543210'),
  passengers: z.array(passengerHoldSchema).min(1).max(6),
  cancellationPolicy: z.any().optional(),
});

export const cancelBookingSchema = z.object({
  seatNos: z.array(z.string().min(1)).min(1, 'At least one seat number is required'),
  reason: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
