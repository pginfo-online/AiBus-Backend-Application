import { z } from 'zod';
export declare const listAgentsQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodOptional<z.ZodEnum<{
        APPROVED: "APPROVED";
        REJECTED: "REJECTED";
        SUSPENDED: "SUSPENDED";
        PENDING_KYC: "PENDING_KYC";
        KYC_SUBMITTED: "KYC_SUBMITTED";
        UNDER_REVIEW: "UNDER_REVIEW";
    }>>;
    city: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema>;
export declare const agentIdParamsSchema: z.ZodObject<{
    agentId: z.ZodString;
}, z.core.$strip>;
export type AgentIdParams = z.infer<typeof agentIdParamsSchema>;
export declare const kycReviewBodySchema: z.ZodObject<{
    action: z.ZodEnum<{
        APPROVE: "APPROVE";
        REJECT: "REJECT";
    }>;
    rejectionReason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type KycReviewBody = z.infer<typeof kycReviewBodySchema>;
export declare const suspendAgentBodySchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strip>;
export type SuspendAgentBody = z.infer<typeof suspendAgentBodySchema>;
export declare const updateCreditLimitBodySchema: z.ZodObject<{
    creditLimit: z.ZodNumber;
}, z.core.$strip>;
export type UpdateCreditLimitBody = z.infer<typeof updateCreditLimitBodySchema>;
//# sourceMappingURL=agent-management.validation.d.ts.map