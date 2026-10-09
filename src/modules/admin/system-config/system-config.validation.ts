// ---------------------------------------------------------------------------
// Admin System Configuration — Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const listConfigQuerySchema = z.object({
  group: z.string().trim().optional(),
}).strict();

export const configKeyParamsSchema = z.object({
  key: z.string().min(1).max(100).trim(),
});

export const createConfigBodySchema = z.object({
  key: z.string().min(2).max(100).trim().regex(/^[a-zA-Z0-9_.-]+$/, 'Key must be alphanumeric with dots, dashes, or underscores'),
  value: z.string(),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).optional().default('STRING'),
  description: z.string().max(250).optional(),
  group: z.string().max(50).optional().default('general'),
  isSecret: z.boolean().optional().default(false),
}).strict();

export const updateConfigBodySchema = z.object({
  value: z.string(),
  description: z.string().max(250).optional(),
  group: z.string().max(50).optional(),
  isSecret: z.boolean().optional(),
}).strict();

export const createFeatureFlagBodySchema = z.object({
  key: z.string().min(2).max(100).trim().regex(/^[a-zA-Z0-9_.-]+$/, 'Key must be alphanumeric'),
  enabled: z.boolean().optional().default(false),
  description: z.string().max(250).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export const toggleFeatureFlagBodySchema = z.object({
  enabled: z.boolean(),
  metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export type ListConfigQuery = z.infer<typeof listConfigQuerySchema>;
export type CreateConfigInput = z.infer<typeof createConfigBodySchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigBodySchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagBodySchema>;
export type ToggleFeatureFlagInput = z.infer<typeof toggleFeatureFlagBodySchema>;
