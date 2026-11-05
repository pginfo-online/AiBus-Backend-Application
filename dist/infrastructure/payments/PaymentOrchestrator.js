"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestrator = void 0;
const env_1 = require("../../config/env");
const database_1 = require("../database");
const logger_1 = require("../logger");
const RazorpayAdapter_1 = require("./adapters/RazorpayAdapter");
const errors_1 = require("../../shared/errors");
const orchestratorLogger = logger_1.logger.child({ module: 'payment-orchestrator' });
class PaymentOrchestrator {
    static instance;
    adapters = new Map();
    healthStates = new Map();
    configCache = new Map();
    lastCacheFetchAt = 0;
    CACHE_TTL_MS = 30000; // 30 seconds
    constructor() {
        this.registerAdapter(new RazorpayAdapter_1.RazorpayAdapter());
        this.healthStates.set('RAZORPAY', {
            failureCount: 0,
            successCount: 0,
            consecutiveFailures: 0,
            isCircuitOpen: false,
        });
    }
    static getInstance() {
        if (!PaymentOrchestrator.instance) {
            PaymentOrchestrator.instance = new PaymentOrchestrator();
        }
        return PaymentOrchestrator.instance;
    }
    registerAdapter(adapter) {
        this.adapters.set(adapter.gatewayName, adapter);
    }
    getAdapter(gateway) {
        const adapter = this.adapters.get(gateway);
        if (!adapter) {
            throw new errors_1.NotFoundError(`Payment gateway adapter '${gateway}' not registered`);
        }
        return adapter;
    }
    /**
     * Initialize and seed payment gateway configurations in DB if not present
     */
    async initialize() {
        try {
            const prisma = (0, database_1.getPrismaClient)();
            const existing = await prisma.paymentGatewayConfig.findUnique({ where: { gateway: 'RAZORPAY' } });
            if (!existing) {
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
                        mode: env_1.env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'LIVE' : 'TEST',
                        trafficWeight: 100,
                        failureThresholdPct: 15,
                        isHealthy: true,
                    },
                });
                orchestratorLogger.info('Default PaymentGatewayConfigs successfully seeded (Razorpay active)');
            }
            await this.refreshConfigCache();
        }
        catch (err) {
            orchestratorLogger.warn({ err: err.message }, 'Failed to initialize payment gateway configs in DB');
        }
    }
    /**
     * Refreshes gateway configuration cache from DB
     */
    async refreshConfigCache() {
        try {
            const prisma = (0, database_1.getPrismaClient)();
            const configs = await prisma.paymentGatewayConfig.findMany({ where: { gateway: 'RAZORPAY' } });
            this.configCache.clear();
            for (const c of configs) {
                this.configCache.set(c.gateway, c);
            }
            this.lastCacheFetchAt = Date.now();
        }
        catch (err) {
            orchestratorLogger.warn({ err: err.message }, 'Failed to refresh payment gateway config cache from DB');
        }
    }
    async getGatewayConfigs() {
        if (Date.now() - this.lastCacheFetchAt > this.CACHE_TTL_MS || this.configCache.size === 0) {
            await this.refreshConfigCache();
        }
        return this.configCache;
    }
    /**
     * Resolve the enabled Razorpay adapter
     */
    async resolveGateway(requestedGateway) {
        const configs = await this.getGatewayConfigs();
        const config = configs.get('RAZORPAY');
        if (requestedGateway && requestedGateway !== 'AUTO' && requestedGateway !== 'RAZORPAY') {
            throw new Error('Unsupported payment gateway');
        }
        if ((config && (!config.isEnabled || config.mode === 'MAINTENANCE')) || !this.isGatewayHealthy('RAZORPAY')) {
            throw new Error('Razorpay is temporarily unavailable');
        }
        return this.getAdapter('RAZORPAY');
    }
    /**
     * Create a Razorpay payment intent and track provider availability
     */
    async createPaymentIntent(params, requestedGateway) {
        const primaryAdapter = await this.resolveGateway(requestedGateway);
        try {
            const result = await primaryAdapter.createPaymentIntent(params);
            this.recordSuccess(primaryAdapter.gatewayName);
            return result;
        }
        catch (primaryErr) {
            orchestratorLogger.error({
                err: primaryErr.message,
                gateway: primaryAdapter.gatewayName,
                bookingId: params.bookingId,
            }, 'Razorpay intent creation failed');
            this.recordFailure(primaryAdapter.gatewayName);
            throw new Error(`Payment service temporarily unavailable. Please retry. (${primaryErr.message})`);
        }
    }
    /**
     * Unified Payment Verification
     */
    async verifyPayment(gatewayHint, params) {
        const adapter = this.getAdapter(gatewayHint);
        return adapter.verifyPayment(params);
    }
    /**
     * Unified Refund Processing
     */
    async processRefund(gatewayHint, params) {
        const adapter = this.getAdapter(gatewayHint);
        return adapter.processRefund(params);
    }
    /**
     * Circuit Breaker & Health Monitoring
     */
    isGatewayHealthy(gateway) {
        const state = this.healthStates.get(gateway);
        if (!state)
            return true;
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
    recordSuccess(gateway) {
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
    recordFailure(gateway) {
        const state = this.healthStates.get(gateway);
        if (state) {
            state.failureCount++;
            state.consecutiveFailures++;
            state.lastFailureAt = new Date();
            if (state.consecutiveFailures >= 5 && !state.isCircuitOpen) {
                state.isCircuitOpen = true;
                state.circuitOpenedAt = new Date();
                orchestratorLogger.error({ gateway, consecutiveFailures: state.consecutiveFailures }, 'Gateway error threshold breached — CIRCUIT TRIPPED OPEN. ');
            }
        }
    }
    getHealthMetrics() {
        const result = {};
        for (const [key, val] of this.healthStates.entries()) {
            result[key] = { ...val };
        }
        return result;
    }
    // -------------------------------------------------------------------------
    // Admin Management APIs
    // -------------------------------------------------------------------------
    async listGateways() {
        const prisma = (0, database_1.getPrismaClient)();
        const configs = await prisma.paymentGatewayConfig.findMany({ where: { gateway: 'RAZORPAY' } });
        return configs.map((c) => {
            const health = this.healthStates.get(c.gateway);
            return {
                ...c,
                isCircuitOpen: health?.isCircuitOpen || false,
                consecutiveFailures: health?.consecutiveFailures || 0,
                totalSuccesses: health?.successCount || 0,
                totalFailures: health?.failureCount || 0,
            };
        });
    }
    async updateGatewayConfig(gateway, updates) {
        const prisma = (0, database_1.getPrismaClient)();
        this.getAdapter(gateway);
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
    async toggleGateway(gateway, isEnabled) {
        const prisma = (0, database_1.getPrismaClient)();
        const updated = await prisma.paymentGatewayConfig.update({
            where: { gateway },
            data: { isEnabled },
        });
        await this.refreshConfigCache();
        return updated;
    }
}
exports.PaymentOrchestrator = PaymentOrchestrator;
//# sourceMappingURL=PaymentOrchestrator.js.map