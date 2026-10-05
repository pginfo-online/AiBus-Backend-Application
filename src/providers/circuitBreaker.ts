import { logger } from '../infrastructure/logger';
import { ProviderCircuitBreakerOpenError } from '../shared/errors';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before opening (default: 5)
  failureWindowMs?: number; // Time window to count failures (default: 60s)
  resetTimeoutMs?: number; // Time in OPEN state before trying HALF_OPEN (default: 30s)
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = []; // Timestamps of failures
  private lastStateChangedAt: number = Date.now();
  private readonly failureThreshold: number;
  private readonly failureWindowMs: number;
  private readonly resetTimeoutMs: number;
  private readonly providerName: string;
  private readonly cbLogger = logger.child({ module: 'circuit-breaker' });

  constructor(providerName: string, options?: CircuitBreakerOptions) {
    this.providerName = providerName;
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.failureWindowMs = options?.failureWindowMs ?? 60000;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30000;
  }

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastStateChangedAt >= this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      this.cbLogger.warn(
        { provider: this.providerName, state: this.state },
        'Circuit breaker is OPEN — rejecting request'
      );
      throw new ProviderCircuitBreakerOpenError(
        `Provider [${this.providerName}] circuit breaker is OPEN due to repeated upstream failures.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error: any) {
      if (this.isFailureTracked(error)) {
        this.onFailure(error);
      }
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.cbLogger.info(
        { provider: this.providerName },
        'Circuit breaker probe succeeded — transitioning to CLOSED'
      );
      this.failures = [];
      this.transitionTo('CLOSED');
    }
  }

  private onFailure(error: any): void {
    const now = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.cbLogger.warn(
        { provider: this.providerName, error: error.message },
        'Circuit breaker probe failed — returning to OPEN'
      );
      this.transitionTo('OPEN');
      return;
    }

    // Filter old failures outside sliding window
    this.failures = this.failures.filter((timestamp) => now - timestamp < this.failureWindowMs);
    this.failures.push(now);

    this.cbLogger.warn(
      {
        provider: this.providerName,
        failureCount: this.failures.length,
        threshold: this.failureThreshold,
        error: error.message,
      },
      'Tracked upstream failure in circuit breaker'
    );

    if (this.failures.length >= this.failureThreshold) {
      this.cbLogger.error(
        { provider: this.providerName, failures: this.failures.length },
        'Circuit breaker tripped — transitioning to OPEN'
      );
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChangedAt = Date.now();
  }

  private isFailureTracked(error: any): boolean {
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
