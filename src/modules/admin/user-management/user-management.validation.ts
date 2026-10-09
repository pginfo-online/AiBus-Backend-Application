// ---------------------------------------------------------------------------
// Admin User Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'lastName', 'email', 'role', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

export const userIdParamsSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});

export const updateUserBodySchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().min(10).max(15).optional(),
  role: z.enum(['CUSTOMER', 'SUPPORT_AGENT', 'OPERATOR_AGENT', 'ADMIN', 'SUPER_ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const suspendUserBodySchema = z.object({
  reason: z.string().min(5).max(500),
}).strict();

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type SuspendUserBody = z.infer<typeof suspendUserBodySchema>;
