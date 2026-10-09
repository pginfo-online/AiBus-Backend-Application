// ---------------------------------------------------------------------------
// Admin Report Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  operatorName: z.string().trim().optional(),
  status: z.string().trim().optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
}).strict();

export type ReportQuery = z.infer<typeof reportQuerySchema>;
