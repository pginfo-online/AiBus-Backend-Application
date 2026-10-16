import { ListLedgerQuery, ManualAdjustmentBody } from './ledger-management.validation';
export declare class LedgerManagementService {
    private static instance;
    private constructor();
    static getInstance(): LedgerManagementService;
    listLedgerEntries(query: ListLedgerQuery): Promise<{
        entries: ({
            agent: {
                id: string;
                email: string;
                businessName: string;
            } | null;
        } & {
            type: import(".prisma/client").$Enums.LedgerEntryType;
            id: string;
            agentId: string | null;
            idempotencyKey: string | null;
            bookingId: string | null;
            currency: string;
            cancellationId: string | null;
            referenceId: string | null;
            description: string;
            batchId: string;
            refundId: string | null;
            topupId: string | null;
            debitAmount: import("@prisma/client/runtime/library").Decimal;
            creditAmount: import("@prisma/client/runtime/library").Decimal;
            postedAt: Date;
            createdBy: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getReconciliationReport(): Promise<{
        totalAgentsAudited: number;
        matchedAgents: number;
        discrepantAgents: number;
        auditTimestamp: Date;
        agents: {
            agentId: string;
            businessName: string;
            status: import(".prisma/client").$Enums.AgentStatus;
            currentBalance: number;
            calculatedBalance: number;
            totalCredits: number;
            totalDebits: number;
            discrepancy: number;
            reconciliationStatus: string;
        }[];
    }>;
    createManualAdjustment(adminId: string, body: ManualAdjustmentBody): Promise<{
        success: boolean;
        agentId: string;
        direction: "CREDIT_AGENT" | "DEBIT_AGENT";
        amount: number;
        updatedWallet: {
            version: number;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agentId: string;
            cashBalance: import("@prisma/client/runtime/library").Decimal;
            creditLimit: import("@prisma/client/runtime/library").Decimal;
            creditUsed: import("@prisma/client/runtime/library").Decimal;
            isFrozen: boolean;
            frozenReason: string | null;
            frozenAt: Date | null;
            frozenBy: string | null;
            totalTopups: import("@prisma/client/runtime/library").Decimal;
            totalSpent: import("@prisma/client/runtime/library").Decimal;
            totalCommission: import("@prisma/client/runtime/library").Decimal;
            totalRefunds: import("@prisma/client/runtime/library").Decimal;
        } | null;
    }>;
}
//# sourceMappingURL=ledger-management.service.d.ts.map