// ---------------------------------------------------------------------------
// Admin Audit Log — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  adminId: z.string().uuid().optional(),
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
  resourceType: z.string().trim().optional(),
  resourceId: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['createdAt', 'module', 'action']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
}).strict();

export const auditLogIdParamsSchema = z.object({
  id: z.string().uuid('Invalid audit log ID'),
});

export const exportAuditLogsQuerySchema = z.object({
  adminId: z.string().uuid().optional(),
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(['csv', 'json']).optional().default('csv'),
}).strict();

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
