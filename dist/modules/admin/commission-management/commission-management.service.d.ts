import { Prisma } from '@prisma/client';
import { ListCommissionRulesQuery, CreateCommissionRuleBody, UpdateCommissionRuleBody } from './commission-management.validation';
export declare class CommissionManagementService {
    private static instance;
    private constructor();
    static getInstance(): CommissionManagementService;
    listRules(query: ListCommissionRulesQuery): Promise<{
        rules: ({
            agent: {
                id: string;
                email: string;
                businessName: string;
            } | null;
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agentId: string | null;
            fromCityId: number | null;
            toCityId: number | null;
            operatorName: string | null;
            isActive: boolean;
            createdBy: string;
            ruleType: import(".prisma/client").$Enums.CommissionRuleType;
            percentage: Prisma.Decimal | null;
            flatAmount: Prisma.Decimal | null;
            minFare: Prisma.Decimal | null;
            maxCommission: Prisma.Decimal | null;
            priority: number;
            effectiveFrom: Date;
            effectiveUntil: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    createRule(adminId: string, body: CreateCommissionRuleBody): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        fromCityId: number | null;
        toCityId: number | null;
        operatorName: string | null;
        isActive: boolean;
        createdBy: string;
        ruleType: import(".prisma/client").$Enums.CommissionRuleType;
        percentage: Prisma.Decimal | null;
        flatAmount: Prisma.Decimal | null;
        minFare: Prisma.Decimal | null;
        maxCommission: Prisma.Decimal | null;
        priority: number;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
    }>;
    updateRule(ruleId: string, body: UpdateCommissionRuleBody): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        fromCityId: number | null;
        toCityId: number | null;
        operatorName: string | null;
        isActive: boolean;
        createdBy: string;
        ruleType: import(".prisma/client").$Enums.CommissionRuleType;
        percentage: Prisma.Decimal | null;
        flatAmount: Prisma.Decimal | null;
        minFare: Prisma.Decimal | null;
        maxCommission: Prisma.Decimal | null;
        priority: number;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
    }>;
    toggleRuleStatus(ruleId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        fromCityId: number | null;
        toCityId: number | null;
        operatorName: string | null;
        isActive: boolean;
        createdBy: string;
        ruleType: import(".prisma/client").$Enums.CommissionRuleType;
        percentage: Prisma.Decimal | null;
        flatAmount: Prisma.Decimal | null;
        minFare: Prisma.Decimal | null;
        maxCommission: Prisma.Decimal | null;
        priority: number;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
    }>;
    deleteRule(ruleId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        fromCityId: number | null;
        toCityId: number | null;
        operatorName: string | null;
        isActive: boolean;
        createdBy: string;
        ruleType: import(".prisma/client").$Enums.CommissionRuleType;
        percentage: Prisma.Decimal | null;
        flatAmount: Prisma.Decimal | null;
        minFare: Prisma.Decimal | null;
        maxCommission: Prisma.Decimal | null;
        priority: number;
        effectiveFrom: Date;
        effectiveUntil: Date | null;
    }>;
}
//# sourceMappingURL=commission-management.service.d.ts.map