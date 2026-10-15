import { z } from 'zod';

export const listAgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      'PENDING_KYC',
      'KYC_SUBMITTED',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'SUSPENDED',
    ])
    .optional(),
  city: z.string().optional(),
  search: z.string().optional(),
});

export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;

export const agentIdParamsSchema = z.object({
  agentId: z.string().uuid(),
});

export type AgentIdParams = z.infer<typeof agentIdParamsSchema>;

export const kycReviewBodySchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().min(3).max(500).optional(),
});

export type KycReviewBody = z.infer<typeof kycReviewBodySchema>;

export const suspendAgentBodySchema = z.object({
  reason: z.string().min(5).max(500),
});

export type SuspendAgentBody = z.infer<typeof suspendAgentBodySchema>;

export const updateCreditLimitBodySchema = z.object({
  creditLimit: z.number().min(0).max(10000000), // Max 1 crore INR
});

export type UpdateCreditLimitBody = z.infer<typeof updateCreditLimitBodySchema>;
