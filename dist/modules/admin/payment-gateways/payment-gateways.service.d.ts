import { UpdateGatewayConfigInput, ToggleGatewayInput } from './payment-gateways.validation';
export declare class PaymentGatewayAdminService {
    private static instance;
    private orchestrator;
    private constructor();
    static getInstance(): PaymentGatewayAdminService;
    listGateways(): Promise<any[]>;
    updateGateway(gateway: string, input: UpdateGatewayConfigInput, adminId: string): Promise<any>;
    toggleGateway(gateway: string, input: ToggleGatewayInput, adminId: string): Promise<any>;
    getGatewayMetrics(): Promise<{
        gateways: any[];
        transactionAggregates: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PaymentGroupByOutputType, ("status" | "gateway")[]> & {
            _count: {
                id: number;
            };
            _sum: {
                amount: import("@prisma/client/runtime/library").Decimal | null;
            };
        })[];
        generatedAt: Date;
    }>;
}
//# sourceMappingURL=payment-gateways.service.d.ts.map