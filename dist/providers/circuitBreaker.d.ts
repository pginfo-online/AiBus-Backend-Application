export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export interface CircuitBreakerOptions {
    failureThreshold?: number;
    failureWindowMs?: number;
    resetTimeoutMs?: number;
}
export declare class CircuitBreaker {
    private state;
    private failures;
    private lastStateChangedAt;
    private readonly failureThreshold;
    private readonly failureWindowMs;
    private readonly resetTimeoutMs;
    private readonly providerName;
    private readonly cbLogger;
    constructor(providerName: string, options?: CircuitBreakerOptions);
    getState(): CircuitState;
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private transitionTo;
    private isFailureTracked;
}
//# sourceMappingURL=circuitBreaker.d.ts.map