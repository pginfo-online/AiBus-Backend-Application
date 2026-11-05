import { IPaymentGateway, GatewayName, PaymentIntentParams, PaymentIntentResult, VerifyPaymentParams, PaymentVerificationResult, ProcessRefundParams, RefundResult } from './IPaymentGateway';
interface GatewayHealthState {
    failureCount: number;
    successCount: number;
    consecutiveFailures: number;
    lastFailureAt?: Date;
    isCircuitOpen: boolean;
    circuitOpenedAt?: Date;
}
export declare class PaymentOrchestrator {
    private static instance;
    private adapters;
    private healthStates;
    private configCache;
    private lastCacheFetchAt;
    private readonly CACHE_TTL_MS;
    private constructor();
    static getInstance(): PaymentOrchestrator;
    registerAdapter(adapter: IPaymentGateway): void;
    getAdapter(gateway: GatewayName): IPaymentGateway;
    /**
     * Initialize and seed payment gateway configurations in DB if not present
     */
    initialize(): Promise<void>;
    /**
     * Refreshes gateway configuration cache from DB
     */
    refreshConfigCache(): Promise<void>;
    private getGatewayConfigs;
    /**
     * Resolve the enabled Razorpay adapter
     */
    resolveGateway(requestedGateway?: string): Promise<IPaymentGateway>;
    /**
     * Create a Razorpay payment intent and track provider availability
     */
    createPaymentIntent(params: PaymentIntentParams, requestedGateway?: string): Promise<PaymentIntentResult>;
    /**
     * Unified Payment Verification
     */
    verifyPayment(gatewayHint: GatewayName, params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
    /**
     * Unified Refund Processing
     */
    processRefund(gatewayHint: GatewayName, params: ProcessRefundParams): Promise<RefundResult>;
    /**
     * Circuit Breaker & Health Monitoring
     */
    isGatewayHealthy(gateway: GatewayName): boolean;
    recordSuccess(gateway: GatewayName): void;
    recordFailure(gateway: GatewayName): void;
    getHealthMetrics(): Record<string, GatewayHealthState>;
    listGateways(): Promise<any[]>;
    updateGatewayConfig(gateway: GatewayName, updates: any): Promise<any>;
    toggleGateway(gateway: GatewayName, isEnabled: boolean): Promise<any>;
}
export {};
//# sourceMappingURL=PaymentOrchestrator.d.ts.map