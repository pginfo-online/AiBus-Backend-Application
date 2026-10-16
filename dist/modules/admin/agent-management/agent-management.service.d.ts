import { ListAgentsQuery, KycReviewBody, SuspendAgentBody, UpdateCreditLimitBody } from './agent-management.validation';
export declare class AgentManagementService {
    private static instance;
    private constructor();
    static getInstance(): AgentManagementService;
    listAgents(query: ListAgentsQuery): Promise<{
        agents: ({
            _count: {
                bookings: number;
                kycDocuments: number;
                staff: number;
            };
            wallet: {
                cashBalance: import("@prisma/client/runtime/library").Decimal;
                creditLimit: import("@prisma/client/runtime/library").Decimal;
                creditUsed: import("@prisma/client/runtime/library").Decimal;
                isFrozen: boolean;
            } | null;
        } & {
            id: string;
            email: string;
            phone: string;
            status: import(".prisma/client").$Enums.AgentStatus;
            createdAt: Date;
            updatedAt: Date;
            city: string;
            state: string;
            businessName: string;
            contactPersonName: string;
            businessAddress: string;
            pincode: string | null;
            logoUrl: string | null;
            gstNumber: string | null;
            panNumber: string | null;
            rejectionReason: string | null;
            approvedAt: Date | null;
            approvedBy: string | null;
            suspendedAt: Date | null;
            suspendedReason: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getAgentDetails(agentId: string): Promise<{
        _count: {
            bookings: number;
        };
        kycDocuments: {
            id: string;
            createdAt: Date;
            agentId: string;
            docType: import(".prisma/client").$Enums.AgentKycDocType;
            fileUrl: string;
            storageKey: string;
            verifiedAt: Date | null;
            verifiedBy: string | null;
            rejectedAt: Date | null;
            rejectReason: string | null;
        }[];
        wallet: {
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
        staff: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                role: import(".prisma/client").$Enums.UserRole;
                status: import(".prisma/client").$Enums.UserStatus;
            };
        } & {
            userId: string;
            id: string;
            role: import(".prisma/client").$Enums.AgentStaffRole;
            agentId: string;
            permissions: import("@prisma/client/runtime/library").JsonValue | null;
            isActive: boolean;
            invitedAt: Date;
            joinedAt: Date | null;
        })[];
        bankAccounts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agentId: string;
            verifiedAt: Date | null;
            accountHolderName: string;
            accountNumber: string;
            ifscCode: string;
            bankName: string;
            isVerified: boolean;
            isPrimary: boolean;
            withdrawFreezeUntil: Date | null;
        }[];
    } & {
        id: string;
        email: string;
        phone: string;
        status: import(".prisma/client").$Enums.AgentStatus;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        state: string;
        businessName: string;
        contactPersonName: string;
        businessAddress: string;
        pincode: string | null;
        logoUrl: string | null;
        gstNumber: string | null;
        panNumber: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        approvedBy: string | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
    }>;
    reviewKyc(agentId: string, adminId: string, body: KycReviewBody): Promise<{
        id: string;
        email: string;
        phone: string;
        status: import(".prisma/client").$Enums.AgentStatus;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        state: string;
        businessName: string;
        contactPersonName: string;
        businessAddress: string;
        pincode: string | null;
        logoUrl: string | null;
        gstNumber: string | null;
        panNumber: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        approvedBy: string | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
    }>;
    suspendAgent(agentId: string, adminId: string, body: SuspendAgentBody): Promise<{
        id: string;
        email: string;
        phone: string;
        status: import(".prisma/client").$Enums.AgentStatus;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        state: string;
        businessName: string;
        contactPersonName: string;
        businessAddress: string;
        pincode: string | null;
        logoUrl: string | null;
        gstNumber: string | null;
        panNumber: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        approvedBy: string | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
    }>;
    reactivateAgent(agentId: string): Promise<{
        id: string;
        email: string;
        phone: string;
        status: import(".prisma/client").$Enums.AgentStatus;
        createdAt: Date;
        updatedAt: Date;
        city: string;
        state: string;
        businessName: string;
        contactPersonName: string;
        businessAddress: string;
        pincode: string | null;
        logoUrl: string | null;
        gstNumber: string | null;
        panNumber: string | null;
        rejectionReason: string | null;
        approvedAt: Date | null;
        approvedBy: string | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
    }>;
    updateCreditLimit(agentId: string, body: UpdateCreditLimitBody): Promise<{
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
    }>;
}
//# sourceMappingURL=agent-management.service.d.ts.map