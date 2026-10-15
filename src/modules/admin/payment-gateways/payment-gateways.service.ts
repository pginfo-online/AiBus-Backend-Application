import { PaymentOrchestrator, GatewayName } from '../../../infrastructure/payments';
import { getPrismaClient } from '../../../infrastructure/database';
import { NotFoundError } from '../../../shared/errors';
import { UpdateGatewayConfigInput, ToggleGatewayInput } from './payment-gateways.validation';

export class PaymentGatewayAdminService {
  private static instance: PaymentGatewayAdminService;
  private orchestrator: PaymentOrchestrator;

  private constructor() {
    this.orchestrator = PaymentOrchestrator.getInstance();
  }

  public static getInstance(): PaymentGatewayAdminService {
    if (!PaymentGatewayAdminService.instance) {
      PaymentGatewayAdminService.instance = new PaymentGatewayAdminService();
    }
    return PaymentGatewayAdminService.instance;
  }

  public async listGateways() {
    return this.orchestrator.listGateways();
  }

  public async updateGateway(gateway: string, input: UpdateGatewayConfigInput, adminId: string) {
    const gwName = gateway.toUpperCase() as GatewayName;
    const updated = await this.orchestrator.updateGatewayConfig(gwName, input);

    const prisma = getPrismaClient();
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

  public async toggleGateway(gateway: string, input: ToggleGatewayInput, adminId: string) {
    const gwName = gateway.toUpperCase() as GatewayName;
    const updated = await this.orchestrator.toggleGateway(gwName, input.isEnabled);

    const prisma = getPrismaClient();
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

  public async getGatewayMetrics() {
    const prisma = getPrismaClient();

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
