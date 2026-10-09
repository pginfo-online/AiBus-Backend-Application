// ---------------------------------------------------------------------------
// Admin Dashboard — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const dashboardOverviewQuerySchema = z.object({
  period: z.enum(['today', '7d', '30d', '90d', '1y']).optional().default('30d'),
}).strict();

export const revenueQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  operatorName: z.string().optional(),
}).strict();

export const bookingAnalyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

export const userAnalyticsQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;
export type RevenueQuery = z.infer<typeof revenueQuerySchema>;
export type BookingAnalyticsQuery = z.infer<typeof bookingAnalyticsQuerySchema>;
export type UserAnalyticsQuery = z.infer<typeof userAnalyticsQuerySchema>;
