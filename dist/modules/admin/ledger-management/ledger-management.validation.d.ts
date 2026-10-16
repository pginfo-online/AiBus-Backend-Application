import { z } from 'zod';
export declare const listLedgerQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    agentId: z.ZodOptional<z.ZodString>;
    bookingId: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        AGENT_WALLET_DEBIT: "AGENT_WALLET_DEBIT";
        AGENT_WALLET_CREDIT: "AGENT_WALLET_CREDIT";
        AGENT_WALLET_TOPUP: "AGENT_WALLET_TOPUP";
        COMMISSION_CREDIT: "COMMISSION_CREDIT";
        COMMISSION_REVERSAL: "COMMISSION_REVERSAL";
        REFUND_CREDIT: "REFUND_CREDIT";
        CONVENIENCE_FEE_DEBIT: "CONVENIENCE_FEE_DEBIT";
        CREDIT_LIMIT_UTILIZATION: "CREDIT_LIMIT_UTILIZATION";
        CREDIT_LIMIT_RELEASE: "CREDIT_LIMIT_RELEASE";
        PLATFORM_REVENUE_CREDIT: "PLATFORM_REVENUE_CREDIT";
        MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT";
    }>>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListLedgerQuery = z.infer<typeof listLedgerQuerySchema>;
export declare const manualAdjustmentBodySchema: z.ZodObject<{
    agentId: z.ZodString;
    amount: z.ZodNumber;
    direction: z.ZodEnum<{
        CREDIT_AGENT: "CREDIT_AGENT";
        DEBIT_AGENT: "DEBIT_AGENT";
    }>;
    reason: z.ZodString;
    idempotencyKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ManualAdjustmentBody = z.infer<typeof manualAdjustmentBodySchema>;
//# sourceMappingURL=ledger-management.validation.d.ts.map