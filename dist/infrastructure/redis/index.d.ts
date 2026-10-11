import Redis from 'ioredis';
export declare const MAX_REDIS_RETRY_ATTEMPTS = 5;
/**
 * Gracefully shuts down and cleans up Redis resources when retries are exhausted
 */
export declare function handleRedisUnavailable(): Promise<void>;
/**
 * Returns true if Redis is currently connected, ready, and healthy
 */
export declare function isRedisAvailable(): boolean;
/**
 * Get the singleton Redis client. Creates one lazily if it doesn't exist.
 */
export declare function getRedisClient(): Redis;
/**
 * Create a new isolated Redis connection for BullMQ.
 * BullMQ requires dedicated connections with error handlers attached.
 */
export declare function createBullMQConnection(): Redis;
/**
 * Connect the shared Redis client with a robust 5-retry strategy.
 * Returns true if connection succeeded, false if Redis remains unavailable.
 */
export declare function connectRedis(maxAttempts?: number): Promise<boolean>;
/**
 * Gracefully disconnect the shared Redis client and free resources.
 */
export declare function disconnectRedis(timeoutMs?: number): Promise<void>;
/**
 * Health check — ping Redis with strict timeout.
 */
export declare function checkRedisHealth(timeoutMs?: number): Promise<boolean>;
/**
 * Acquire a distributed lock using SET NX EX.
 * Gracefully degrades to true (proceeding) if Redis is offline.
 */
export declare function acquireLock(key: string, owner: string, ttlSeconds: number): Promise<boolean>;
/**
 * Release a distributed lock. Only releases if the owner matches.
 */
export declare function releaseLock(key: string, owner: string): Promise<boolean>;
export type { Redis };
//# sourceMappingURL=index.d.ts.map