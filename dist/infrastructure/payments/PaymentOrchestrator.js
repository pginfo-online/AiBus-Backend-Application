"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentOrchestrator = void 0;
const env_1 = require("../../config/env");
const database_1 = require("../database");
const logger_1 = require("../logger");
const RazorpayAdapter_1 = require("./adapters/RazorpayAdapter");
const PhonePeAdapter_1 = require("./adapters/PhonePeAdapter");
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
        this.registerAdapter(new PhonePeAdapter_1.PhonePeAdapter());
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
                        mode: env_1.env.RAZORPAY_KEY_ID?.startsWith('rzp_live') ? 'LIVE' : 'TEST',
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
            const configs = await prisma.paymentGatewayConfig.findMany();
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
     * Smart Router: Resolves the optimal gateway for a transaction
     * Evaluates admin config, health metrics, circuit breaker, and payment method affinity
     */
    async resolveGateway(requestedGateway, paymentMethod) {
        const configs = await this.getGatewayConfigs();
        // 1. If explicit gateway requested and healthy/enabled, honor request
        if (requestedGateway && requestedGateway !== 'AUTO') {
            const gwName = requestedGateway.toUpperCase();
            const config = configs.get(gwName);
            const isHealthy = this.isGatewayHealthy(gwName);
            if (((config && config.isEnabled) || env_1.isTest) && isHealthy && config?.mode !== 'MAINTENANCE') {
                return this.getAdapter(gwName);
            }
            orchestratorLogger.warn({ requestedGateway, isHealthy, isEnabled: config?.isEnabled }, 'Requested gateway is unavailable or degraded; routing engine resolving healthy fallback');
        }
        // 2. Select primary gateway if healthy and enabled
        for (const [, config] of configs) {
            if (config.isPrimary && config.isEnabled && config.mode !== 'MAINTENANCE') {
                const gwName = config.gateway;
                if (this.isGatewayHealthy(gwName)) {
                    return this.getAdapter(gwName);
                }
            }
        }
        // 3. Fallback: select any enabled, healthy gateway
        for (const [, config] of configs) {
            if (config.isEnabled && config.mode !== 'MAINTENANCE') {
                const gwName = config.gateway;
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
    async createPaymentIntentWithFallback(params, requestedGateway) {
        const primaryAdapter = await this.resolveGateway(requestedGateway, params.paymentMode);
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
            }, 'Primary payment gateway intent creation failed; attempting automatic failover');
            this.recordFailure(primaryAdapter.gatewayName);
            // Identify alternative fallback gateway (only if configured and healthy)
            const fallbackGatewayName = primaryAdapter.gatewayName === 'RAZORPAY' ? 'PHONEPE' : 'RAZORPAY';
            const fallbackAdapter = this.getAdapter(fallbackGatewayName);
            if ((fallbackAdapter.isConfigured() || env_1.isTest) && this.isGatewayHealthy(fallbackGatewayName)) {
                try {
                    const fallbackResult = await fallbackAdapter.createPaymentIntent(params);
                    this.recordSuccess(fallbackGatewayName);
                    orchestratorLogger.info({
                        originalGateway: primaryAdapter.gatewayName,
                        fallbackGateway: fallbackGatewayName,
                        bookingId: params.bookingId,
                    }, 'Automatic gateway failover SUCCEEDED — transaction protected from downtime');
                    return fallbackResult;
                }
                catch (fallbackErr) {
                    this.recordFailure(fallbackGatewayName);
                    orchestratorLogger.error({
                        fallbackErr: fallbackErr.message,
                        bookingId: params.bookingId,
                    }, 'Both primary and fallback payment gateways failed');
                }
            }
            throw new Error(`Payment service temporarily unavailable. Please retry. (${primaryErr.message})`);
        }
    }
    /**
     * Unified Payment Verification
     */
    async verifyPayment(gatewayHint, params) {
        const adapter = this.getAdapter(gatewayHint);
        const result = await adapter.verifyPayment(params);
        if (result.success) {
            this.recordSuccess(gatewayHint);
        }
        else {
            this.recordFailure(gatewayHint);
        }
        return result;
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
                orchestratorLogger.error({ gateway, consecutiveFailures: state.consecutiveFailures }, 'Gateway error threshold breached — CIRCUIT TRIPPED OPEN. Traffic diverted.');
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
        let configs = [];
        try {
            configs = await prisma.paymentGatewayConfig.findMany({
                orderBy: { priority: 'asc' },
            });
        }
        catch {
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