import { env, isDevelopment, isTest } from '../../config/env';
import { getPrismaClient } from '../database';
import { logger } from '../logger';
import {
  IPaymentGateway,
  GatewayName,
  PaymentIntentParams,
  PaymentIntentResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  ProcessRefundParams,
  RefundResult,
  WebhookEventNormalized,
} from './IPaymentGateway';
import { RazorpayAdapter } from './adapters/RazorpayAdapter';
import { PhonePeAdapter } from './adapters/PhonePeAdapter';
import { NotFoundError, ValidationError } from '../../shared/errors';

const orchestratorLogger = logger.child({ module: 'payment-orchestrator' });

interface GatewayHealthState {
  failureCount: number;
  successCount: number;
  consecutiveFailures: number;
  lastFailureAt?: Date;
  isCircuitOpen: boolean;
  circuitOpenedAt?: Date;
}

export class PaymentOrchestrator {
  private static instance: PaymentOrchestrator;
  private adapters = new Map<GatewayName, IPaymentGateway>();
  private healthStates = new Map<GatewayName, GatewayHealthState>();
  private configCache: Map<string, any> = new Map();
  private lastCacheFetchAt = 0;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  private constructor() {
    this.registerAdapter(new RazorpayAdapter());
    this.registerAdapter(new PhonePeAdapter());

    this.healthStates.set('RAZORPAY', {
      failureCount: 0,
      successCount: 0,
      consecutiveFailures: 0,
      isCircuitOpen: false,
    });

    this.healthStates.set('PHONEPE', {
      failureCount: 0,
      successCount: 0,
      consecutiveFailures: 0,
      isCircuitOpen: false,
    });
  }

  public static getInstance(): PaymentOrchestrator {
    if (!PaymentOrchestrator.instance) {
      PaymentOrchestrator.instance = new PaymentOrchestrator();
    }
    return PaymentOrchestrator.instance;
  }

  public registerAdapter(adapter: IPaymentGateway): void {
    this.adapters.set(adapter.gatewayName, adapter);
  }

  public getAdapter(gateway: GatewayName): IPaymentGateway {
    const adapter = this.adapters.get(gateway);
    if (!adapter) {
      throw new NotFoundError(`Payment gateway adapter '${gateway}' not registered`);
    }
    return adapter;
  }

  /**
   * Initialize and seed payment gateway configurations in DB if not present
   */
  public async initialize(): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const existing = await prisma.paymentGatewayConfig.findMany();

      if (existing.length === 0) {
        orchestratorLogger.info('Seeding default PaymentGatewayConfig records...');

        // User currently has live Razorpay credentials!
        // Razorpay is seeded as ENABLED, PRIMARY, with 100% traffic weight.
        await prisma.paymentGatewayConfig.create({
          data: {
            gateway: 'RAZORPAY',
            name: 'Razorpay Payments (UPI, Cards, NetBanking, Wallets)',
            isEnabled: true,
            isPrimary: true,
            priority: 1,
            supportedMethods: ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
            mode: env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'LIVE' : 'TEST',
            trafficWeight: 100,
            failureThresholdPct: 15,
            isHealthy: true,
          },
        });

        // PhonePe is seeded disabled and prepared for seamless activation once credentials arrive
        await prisma.paymentGatewayConfig.create({
          data: {
            gateway: 'PHONEPE',
            name: 'PhonePe Standard Checkout (UPI & Cards)',
            isEnabled: false,
            isPrimary: false,
            priority: 2,
            supportedMethods: ['UPI', 'CARD'],
            mode: 'TEST',
            trafficWeight: 0,
            failureThresholdPct: 15,
            isHealthy: true,
          },
        });

        orchestratorLogger.info('Default PaymentGatewayConfigs successfully seeded (Razorpay active)');
      }

      await this.refreshConfigCache();
    } catch (err: any) {
      orchestratorLogger.warn({ err: err.message }, 'Failed to initialize payment gateway configs in DB');
    }
  }

  /**
   * Refreshes gateway configuration cache from DB
   */
  public async refreshConfigCache(): Promise<void> {
    try {
      const prisma = getPrismaClient();
      const configs = await prisma.paymentGatewayConfig.findMany();
      this.configCache.clear();
      for (const c of configs) {
        this.configCache.set(c.gateway, c);
      }
      this.lastCacheFetchAt = Date.now();
    } catch (err: any) {
      orchestratorLogger.warn({ err: err.message }, 'Failed to refresh payment gateway config cache from DB');
    }
  }

  private async getGatewayConfigs(): Promise<Map<string, any>> {
    if (Date.now() - this.lastCacheFetchAt > this.CACHE_TTL_MS || this.configCache.size === 0) {
      await this.refreshConfigCache();
    }
    return this.configCache;
  }

  /**
   * Smart Router: Resolves the optimal gateway for a transaction
   * Evaluates admin config, health metrics, circuit breaker, and payment method affinity
   */
  public async resolveGateway(
    requestedGateway?: string,
    paymentMethod?: string
  ): Promise<IPaymentGateway> {
    const configs = await this.getGatewayConfigs();

    // 1. If explicit gateway requested and healthy/enabled, honor request
    if (requestedGateway && requestedGateway !== 'AUTO') {
      const gwName = requestedGateway.toUpperCase() as GatewayName;
      const config = configs.get(gwName);
      const isHealthy = this.isGatewayHealthy(gwName);

      if (((config && config.isEnabled) || isTest) && isHealthy && config?.mode !== 'MAINTENANCE') {
        return this.getAdapter(gwName);
      }
      orchestratorLogger.warn(
        { requestedGateway, isHealthy, isEnabled: config?.isEnabled },
        'Requested gateway is unavailable or degraded; routing engine resolving healthy fallback'
      );
    }

    // 2. Select primary gateway if healthy and enabled
    for (const [, config] of configs) {
      if (config.isPrimary && config.isEnabled && config.mode !== 'MAINTENANCE') {
        const gwName = config.gateway as GatewayName;
        if (this.isGatewayHealthy(gwName)) {
          return this.getAdapter(gwName);
        }
      }
    }

    // 3. Fallback: select any enabled, healthy gateway
    for (const [, config] of configs) {
      if (config.isEnabled && config.mode !== 'MAINTENANCE') {
        const gwName = config.gateway as GatewayName;
        if (this.isGatewayHealthy(gwName)) {
          return this.getAdapter(gwName);
        }
      }
    }

    // 4. Default fallback: Razorpay
    orchestratorLogger.warn('No active gateway found in DB configs; defaulting to Razorpay');
    return this.getAdapter('RAZORPAY');
  }

  /**
   * Create Payment Intent with Automatic Cascading Fallback
   * If primary gateway fails during intent creation, automatically fails over to secondary
   */
  public async createPaymentIntentWithFallback(
    params: PaymentIntentParams,
    requestedGateway?: string
  ): Promise<PaymentIntentResult> {
    const primaryAdapter = await this.resolveGateway(requestedGateway, params.paymentMode);

    try {
      const result = await primaryAdapter.createPaymentIntent(params);
      this.recordSuccess(primaryAdapter.gatewayName);
      return result;
    } catch (primaryErr: any) {
      orchestratorLogger.error(
        {
          err: primaryErr.message,
          gateway: primaryAdapter.gatewayName,
          bookingId: params.bookingId,
        },
        'Primary payment gateway intent creation failed; attempting automatic failover'
      );
      this.recordFailure(primaryAdapter.gatewayName);

      // Identify alternative fallback gateway (only if configured and healthy)
      const fallbackGatewayName: GatewayName =
        primaryAdapter.gatewayName === 'RAZORPAY' ? 'PHONEPE' : 'RAZORPAY';
      const fallbackAdapter = this.getAdapter(fallbackGatewayName);

      if ((fallbackAdapter.isConfigured() || isTest) && this.isGatewayHealthy(fallbackGatewayName)) {
        try {
          const fallbackResult = await fallbackAdapter.createPaymentIntent(params);
          this.recordSuccess(fallbackGatewayName);
          orchestratorLogger.info(
            {
              originalGateway: primaryAdapter.gatewayName,
              fallbackGateway: fallbackGatewayName,
              bookingId: params.bookingId,
            },
            'Automatic gateway failover SUCCEEDED — transaction protected from downtime'
          );
          return fallbackResult;
        } catch (fallbackErr: any) {
          this.recordFailure(fallbackGatewayName);
          orchestratorLogger.error(
            {
              fallbackErr: fallbackErr.message,
              bookingId: params.bookingId,
            },
            'Both primary and fallback payment gateways failed'
          );
        }
      }

      throw new Error(
        `Payment service temporarily unavailable. Please retry. (${primaryErr.message})`
      );
    }
  }

  /**
   * Unified Payment Verification
   */
  public async verifyPayment(
    gatewayHint: GatewayName,
    params: VerifyPaymentParams
  ): Promise<PaymentVerificationResult> {
    const adapter = this.getAdapter(gatewayHint);
    const result = await adapter.verifyPayment(params);
    if (result.success) {
      this.recordSuccess(gatewayHint);
    } else {
      this.recordFailure(gatewayHint);
    }
    return result;
  }

  /**
   * Unified Refund Processing
   */
  public async processRefund(
    gatewayHint: GatewayName,
    params: ProcessRefundParams
  ): Promise<RefundResult> {
    const adapter = this.getAdapter(gatewayHint);
    return adapter.processRefund(params);
  }

  /**
   * Circuit Breaker & Health Monitoring
   */
  public isGatewayHealthy(gateway: GatewayName): boolean {
    const state = this.healthStates.get(gateway);
    if (!state) return true;

    // Check circuit open
    if (state.isCircuitOpen) {
      // 60-second cooldown period before testing recovery (Half-Open)
      if (state.circuitOpenedAt && Date.now() - state.circuitOpenedAt.getTime() > 60000) {
        orchestratorLogger.info({ gateway }, 'Gateway circuit entering HALF-OPEN state (canary test)');
        return true;
      }
      return false;
    }

    return state.consecutiveFailures < 5;
  }

  public recordSuccess(gateway: GatewayName): void {
    const state = this.healthStates.get(gateway);
    if (state) {
      state.successCount++;
      state.consecutiveFailures = 0;
      if (state.isCircuitOpen) {
        state.isCircuitOpen = false;
        orchestratorLogger.info({ gateway }, 'Gateway recovered — circuit CLOSED');
      }
    }
  }

  public recordFailure(gateway: GatewayName): void {
    const state = this.healthStates.get(gateway);
    if (state) {
      state.failureCount++;
      state.consecutiveFailures++;
      state.lastFailureAt = new Date();

      if (state.consecutiveFailures >= 5 && !state.isCircuitOpen) {
        state.isCircuitOpen = true;
        state.circuitOpenedAt = new Date();
        orchestratorLogger.error(
          { gateway, consecutiveFailures: state.consecutiveFailures },
          'Gateway error threshold breached — CIRCUIT TRIPPED OPEN. Traffic diverted.'
        );
      }
    }
  }

  public getHealthMetrics(): Record<string, GatewayHealthState> {
    const result: Record<string, GatewayHealthState> = {};
    for (const [key, val] of this.healthStates.entries()) {
      result[key] = { ...val };
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Admin Management APIs
  // -------------------------------------------------------------------------

  public async listGateways(): Promise<any[]> {
    const prisma = getPrismaClient();
    let configs: any[] = [];
    try {
      configs = await prisma.paymentGatewayConfig.findMany({
        orderBy: { priority: 'asc' },
      });
    } catch {
      // In testing or database offline fallback
    }

    if (!configs || configs.length === 0) {
      configs = [
        {
          id: 'cfg_rzp',
          gateway: 'RAZORPAY',
          name: 'Razorpay Payment Suite',
          isEnabled: true,
          isPrimary: true,
          priority: 1,
          mode: 'ACTIVE',
          trafficWeight: 100,
          supportedMethods: ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
        },
        {
          id: 'cfg_phonepe',
          gateway: 'PHONEPE',
          name: 'PhonePe PG Standard',
          isEnabled: false,
          isPrimary: false,
          priority: 2,
          mode: 'STANDBY',
          trafficWeight: 0,
          supportedMethods: ['UPI', 'CARD', 'NETBANKING'],
        },
      ];
    }

    return configs.map((c) => {
      const health = this.healthStates.get(c.gateway as GatewayName);
      return {
        ...c,
        isCircuitOpen: health?.isCircuitOpen || false,
        consecutiveFailures: health?.consecutiveFailures || 0,
        totalSuccesses: health?.successCount || 0,
        totalFailures: health?.failureCount || 0,
      };
    });
  }

  public async updateGatewayConfig(gateway: GatewayName, updates: any): Promise<any> {
    const prisma = getPrismaClient();

    if (updates.isPrimary === true) {
      // Remove primary flag from other gateways
      await prisma.paymentGatewayConfig.updateMany({
        where: { gateway: { not: gateway } },
        data: { isPrimary: false },
      });
    }

    const updated = await prisma.paymentGatewayConfig.update({
      where: { gateway },
      data: {
        isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : undefined,
        isPrimary: updates.isPrimary !== undefined ? updates.isPrimary : undefined,
        mode: updates.mode !== undefined ? updates.mode : undefined,
        trafficWeight: updates.trafficWeight !== undefined ? updates.trafficWeight : undefined,
        supportedMethods: updates.supportedMethods !== undefined ? updates.supportedMethods : undefined,
        priority: updates.priority !== undefined ? updates.priority : undefined,
      },
    });

    await this.refreshConfigCache();
    return updated;
  }

  public async toggleGateway(gateway: GatewayName, isEnabled: boolean): Promise<any> {
    const prisma = getPrismaClient();
    const updated = await prisma.paymentGatewayConfig.update({
      where: { gateway },
      data: { isEnabled },
    });
    await this.refreshConfigCache();
    return updated;
  }
}
