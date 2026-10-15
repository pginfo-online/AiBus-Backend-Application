import { z } from 'zod';

export const updateGatewayConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  mode: z.enum(['LIVE', 'TEST', 'MAINTENANCE']).optional(),
  trafficWeight: z.number().int().min(0).max(100).optional(),
  supportedMethods: z.array(z.string()).optional(),
  priority: z.number().int().positive().optional(),
});

export const toggleGatewaySchema = z.object({
  isEnabled: z.boolean(),
});

export type UpdateGatewayConfigInput = z.infer<typeof updateGatewayConfigSchema>;
export type ToggleGatewayInput = z.infer<typeof toggleGatewaySchema>;
