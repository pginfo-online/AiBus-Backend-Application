"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayAdminService = void 0;
const payments_1 = require("../../../infrastructure/payments");
const database_1 = require("../../../infrastructure/database");
class PaymentGatewayAdminService {
    static instance;
    orchestrator;
    constructor() {
        this.orchestrator = payments_1.PaymentOrchestrator.getInstance();
    }
    static getInstance() {
        if (!PaymentGatewayAdminService.instance) {
            PaymentGatewayAdminService.instance = new PaymentGatewayAdminService();
        }
        return PaymentGatewayAdminService.instance;
    }
    async listGateways() {
        return this.orchestrator.listGateways();
    }
    async updateGateway(gateway, input, adminId) {
        const gwName = gateway.toUpperCase();
        const updated = await this.orchestrator.updateGatewayConfig(gwName, input);
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'UPDATE_PAYMENT_GATEWAY_CONFIG',
                module: 'payment-gateways',
                resourceType: 'PAYMENT_GATEWAY_CONFIG',
                resourceId: updated.id,
                details: { gateway: gwName, updates: input },
            },
        });
        return updated;
    }
    async toggleGateway(gateway, input, adminId) {
        const gwName = gateway.toUpperCase();
        const updated = await this.orchestrator.toggleGateway(gwName, input.isEnabled);
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: input.isEnabled ? 'ENABLE_PAYMENT_GATEWAY' : 'DISABLE_PAYMENT_GATEWAY',
                module: 'payment-gateways',
                resourceType: 'PAYMENT_GATEWAY_CONFIG',
                resourceId: updated.id,
                details: { gateway: gwName, isEnabled: input.isEnabled },
            },
        });
        return updated;
    }
    async getGatewayMetrics() {
        const prisma = (0, database_1.getPrismaClient)();
        // Aggregated transaction metrics per gateway
        const stats = await prisma.payment.groupBy({
            by: ['gateway', 'status'],
            _count: { id: true },
            _sum: { amount: true },
        });
        const liveGateways = await this.orchestrator.listGateways();
        return {
            gateways: liveGateways,
            transactionAggregates: stats,
            generatedAt: new Date(),
        };
    }
}
exports.PaymentGatewayAdminService = PaymentGatewayAdminService;
//# sourceMappingURL=payment-gateways.service.js.map