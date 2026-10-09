// ---------------------------------------------------------------------------
// Admin Support Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'ESCALATED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.string().trim().optional(),
  assignedTo: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'priority', 'status', 'updatedAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid('Invalid ticket ID'),
});

export const createTicketBodySchema = z.object({
  userId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  subject: z.string().min(3).max(200).trim(),
  description: z.string().min(5).max(5000).trim(),
  category: z.enum(['BOOKING', 'PAYMENT', 'REFUND', 'CANCELLATION', 'GENERAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  assignedTo: z.string().uuid().optional(),
}).strict();

export const updateTicketBodySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'ESCALATED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['BOOKING', 'PAYMENT', 'REFUND', 'CANCELLATION', 'GENERAL', 'OTHER']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
}).strict();

export const createTicketReplyBodySchema = z.object({
  message: z.string().min(1).max(5000).trim(),
  isInternal: z.boolean().optional().default(false),
}).strict();

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketBodySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketBodySchema>;
export type CreateTicketReplyInput = z.infer<typeof createTicketReplyBodySchema>;
