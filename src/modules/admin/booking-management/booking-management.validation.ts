// ---------------------------------------------------------------------------
// Admin Booking Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  operatorName: z.string().optional(),
  fromCityName: z.string().optional(),
  toCityName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  sortBy: z.enum(['createdAt', 'totalFare', 'journeyDate', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const bookingIdParamsSchema = z.object({
  id: z.string().uuid('Invalid booking ID'),
});

export const updateBookingStatusBodySchema = z.object({
  status: z.string().min(1, 'Status is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
}).strict();

export const adminCancelBookingBodySchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
  initiateRefund: z.boolean().optional().default(true),
}).strict();

export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type UpdateBookingStatusBody = z.infer<typeof updateBookingStatusBodySchema>;
export type AdminCancelBookingBody = z.infer<typeof adminCancelBookingBodySchema>;
