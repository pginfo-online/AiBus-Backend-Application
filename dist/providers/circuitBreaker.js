"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const logger_1 = require("../infrastructure/logger");
const errors_1 = require("../shared/errors");
class CircuitBreaker {
    state = 'CLOSED';
    failures = []; // Timestamps of failures
    lastStateChangedAt = Date.now();
    failureThreshold;
    failureWindowMs;
    resetTimeoutMs;
    providerName;
    cbLogger = logger_1.logger.child({ module: 'circuit-breaker' });
    constructor(providerName, options) {
        this.providerName = providerName;
        this.failureThreshold = options?.failureThreshold ?? 5;
        this.failureWindowMs = options?.failureWindowMs ?? 60000;
        this.resetTimeoutMs = options?.resetTimeoutMs ?? 30000;
    }
    getState() {
        const now = Date.now();
        if (this.state === 'OPEN') {
            if (now - this.lastStateChangedAt >= this.resetTimeoutMs) {
                this.transitionTo('HALF_OPEN');
            }
        }
        return this.state;
    }
    async execute(fn) {
        const currentState = this.getState();
        if (currentState === 'OPEN') {
            this.cbLogger.warn({ provider: this.providerName, state: this.state }, 'Circuit breaker is OPEN — rejecting request');
            throw new errors_1.ProviderCircuitBreakerOpenError(`Provider [${this.providerName}] circuit breaker is OPEN due to repeated upstream failures.`);
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            if (this.isFailureTracked(error)) {
                this.onFailure(error);
            }
            throw error;
        }
    }
    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.cbLogger.info({ provider: this.providerName }, 'Circuit breaker probe succeeded — transitioning to CLOSED');
            this.failures = [];
            this.transitionTo('CLOSED');
        }
    }
    onFailure(error) {
        const now = Date.now();
        if (this.state === 'HALF_OPEN') {
            this.cbLogger.warn({ provider: this.providerName, error: error.message }, 'Circuit breaker probe failed — returning to OPEN');
            this.transitionTo('OPEN');
            return;
        }
        // Filter old failures outside sliding window
        this.failures = this.failures.filter((timestamp) => now - timestamp < this.failureWindowMs);
        this.failures.push(now);
        this.cbLogger.warn({
            provider: this.providerName,
            failureCount: this.failures.length,
            threshold: this.failureThreshold,
            error: error.message,
        }, 'Tracked upstream failure in circuit breaker');
        if (this.failures.length >= this.failureThreshold) {
            this.cbLogger.error({ provider: this.providerName, failures: this.failures.length }, 'Circuit breaker tripped — transitioning to OPEN');
            this.transitionTo('OPEN');
        }
    }
    transitionTo(newState) {
        this.state = newState;
        this.lastStateChangedAt = Date.now();
    }
    isFailureTracked(error) {
        // Track network timeouts, ECONNREFUSED, 5xx status codes, and 429
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            return true;
        }
        if (error.response?.status) {
            const status = error.response.status;
            return status >= 500 || status === 429;
        }
        return false;
    }
}
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuitBreaker.js.map