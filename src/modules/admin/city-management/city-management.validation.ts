// ---------------------------------------------------------------------------
// Admin City Management — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listCitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().optional(),
  state: z.string().trim().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  sortBy: z.enum(['name', 'state', 'createdAt', 'active']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
}).strict();

export const cityIdParamsSchema = z.object({
  id: z.string().uuid('Invalid city ID'),
});

export const createCityBodySchema = z.object({
  name: z.string().min(2).max(100).trim(),
  state: z.string().min(2).max(100).trim().optional(),
  providerCityId: z.number().int().positive().optional(),
  providerName: z.string().max(50).optional().default('GDS'),
  aliases: z.array(z.string().trim()).optional(),
  active: z.boolean().optional().default(true),
}).strict();

export const updateCityBodySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  state: z.string().min(2).max(100).trim().nullable().optional(),
  providerCityId: z.number().int().positive().nullable().optional(),
  providerName: z.string().max(50).optional(),
  aliases: z.array(z.string().trim()).nullable().optional(),
  active: z.boolean().optional(),
}).strict();

export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;
export type CreateCityInput = z.infer<typeof createCityBodySchema>;
export type UpdateCityInput = z.infer<typeof updateCityBodySchema>;
