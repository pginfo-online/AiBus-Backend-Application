import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker } from '../../src/providers/circuitBreaker';
import { ProviderCircuitBreakerOpenError } from '../../src/shared/errors';

describe('CircuitBreaker Unit Tests', () => {
  it('should start in CLOSED state and execute successful calls', async () => {
    const cb = new CircuitBreaker('TEST_PROVIDER', { failureThreshold: 3, resetTimeoutMs: 1000 });
    expect(cb.getState()).toBe('CLOSED');

    const result = await cb.execute(async () => 'OK');
    expect(result).toBe('OK');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should trip to OPEN after reaching failure threshold', async () => {
    const cb = new CircuitBreaker('TEST_PROVIDER', {
      failureThreshold: 2,
      failureWindowMs: 5000,
      resetTimeoutMs: 1000,
    });

    const failingFn = async () => {
      const err = new Error('Gateway Timeout');
      (err as any).code = 'ETIMEDOUT';
      throw err;
    };

    // Failure 1
    await expect(cb.execute(failingFn)).rejects.toThrow('Gateway Timeout');
    expect(cb.getState()).toBe('CLOSED');

    // Failure 2 (trips circuit)
    await expect(cb.execute(failingFn)).rejects.toThrow('Gateway Timeout');
    expect(cb.getState()).toBe('OPEN');

    // Subsequent call fails immediately without invoking function
    const probeSpy = vi.fn();
    await expect(cb.execute(probeSpy)).rejects.toThrow(ProviderCircuitBreakerOpenError);
    expect(probeSpy).not.toHaveBeenCalled();
  });

  it('should transition to HALF_OPEN after resetTimeoutMs expires', async () => {
    const cb = new CircuitBreaker('TEST_PROVIDER', {
      failureThreshold: 1,
      resetTimeoutMs: 50, // 50ms
    });

    const failingFn = async () => {
      const err = new Error('500 Server Error');
      (err as any).response = { status: 502 };
      throw err;
    };

    await expect(cb.execute(failingFn)).rejects.toThrow('500 Server Error');
    expect(cb.getState()).toBe('OPEN');

    // Wait 60ms for timeout to elapse
    await new Promise((r) => setTimeout(r, 60));
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful probe transitions back to CLOSED
    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('should NOT trip on business 4xx client errors', async () => {
    const cb = new CircuitBreaker('TEST_PROVIDER', { failureThreshold: 2 });

    const businessErrorFn = async () => {
      const err = new Error('Bad Request: Invalid City ID');
      (err as any).response = { status: 400 };
      throw err;
    };

    // Multiple 400s
    await expect(cb.execute(businessErrorFn)).rejects.toThrow('Bad Request');
    await expect(cb.execute(businessErrorFn)).rejects.toThrow('Bad Request');
    await expect(cb.execute(businessErrorFn)).rejects.toThrow('Bad Request');

    // Should still remain CLOSED
    expect(cb.getState()).toBe('CLOSED');
  });
});
