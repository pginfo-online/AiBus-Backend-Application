import { z } from 'zod';

export const passengerHoldSchema = z.object({
  seatNo: z.string().min(1, 'seatNo is required'),
  seatTypeId: z.coerce.number().int().positive(),
  fare: z.coerce.number().positive(),
  gender: z.enum(['M', 'F']),
  age: z.coerce.number().int().min(1).max(120),
  name: z.string().min(2, 'Passenger name is required').trim(),
  isAcSeat: z.boolean().default(false),
});

export const holdSeatsSchema = z.object({
  fromCityId: z.coerce.number().int().positive(),
  toCityId: z.coerce.number().int().positive(),
  journeyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'journeyDate must be YYYY-MM-DD'),
  busId: z.coerce.number().int().positive(),
  pickupId: z.string().min(1, 'pickupId is required'),
  dropoffId: z.string().min(1, 'dropoffId is required'),
  contactInfo: z.object({
    customerName: z.string().min(2, 'customerName is required').trim(),
    email: z.string().email('Invalid email address').trim(),
    phone: z.string().min(10, 'Valid phone number is required').trim(),
    mobile: z.string().min(10, 'Valid mobile number is required').trim(),
  }),
  gstDetails: z
    .object({
      gstin: z.string().min(15).max(15),
      gstCompany: z.string().min(2),
    })
    .optional(),
  passengers: z.array(passengerHoldSchema).min(1, 'At least 1 passenger is required').max(6, 'Maximum 6 seats per booking'),
});

export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
