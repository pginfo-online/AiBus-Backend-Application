import { z } from 'zod';

export const passengerHoldSchema = z.object({
  seatNo: z.string().min(1, 'seatNo is required'),
  seatTypeId: z.coerce.number().int().nonnegative().default(1),
  fare: z.coerce.number().nonnegative(),
  gender: z.preprocess((val) => {
    if (typeof val === 'string') {
      const upper = val.trim().toUpperCase();
      if (upper.startsWith('F')) return 'F';
      return 'M';
    }
    return 'M';
  }, z.enum(['M', 'F'])),
  age: z.coerce.number().int().min(1).max(120).default(25),
  name: z.string().min(1, 'Passenger name is required').trim(),
  isAcSeat: z.boolean().default(false),
});

export const holdSeatsSchema = z.object({
  fromCityId: z.coerce.number().int().nonnegative(),
  toCityId: z.coerce.number().int().nonnegative(),
  journeyDate: z.string().min(1).transform((val) => (val.includes('T') ? val.split('T')[0] : (val.includes(' ') ? val.split(' ')[0] : val))),
  busId: z.coerce.number().int().nonnegative(),
  pickupId: z.coerce.string().min(1).default('1'),
  dropoffId: z.coerce.string().min(1).default('1'),
  contactInfo: z.object({
    customerName: z.string().trim().min(1).default('Traveller'),
    email: z.string().trim().email().or(z.string().trim().min(1)).default('booking@aibus.in'),
    phone: z.string().trim().min(1).default('9876543210'),
    mobile: z.string().trim().min(1).default('9876543210'),
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
