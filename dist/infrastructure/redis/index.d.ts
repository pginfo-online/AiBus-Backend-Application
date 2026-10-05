import Redis from 'ioredis';
/**
 * Get the singleton Redis client. Creates one if it doesn't exist.
 */
export declare function getRedisClient(): Redis;
/**
 * Create a new Redis connection for BullMQ.
 * BullMQ requires its own connections — do NOT reuse the shared client.
 */
export declare function createBullMQConnection(): Redis;
/**
 * Connect the shared Redis client.
 */
export declare function connectRedis(): Promise<void>;
/**
 * Disconnect the shared Redis client.
 */
export declare function disconnectRedis(): Promise<void>;
/**
 * Health check — ping Redis.
 */
export declare function checkRedisHealth(): Promise<boolean>;
/**
 * Acquire a distributed lock using SET NX EX.
 * Returns true if acquired, false if already held.
 */
export declare function acquireLock(key: string, owner: string, ttlSeconds: number): Promise<boolean>;
/**
 * Release a distributed lock. Only releases if the owner matches.
 * Uses Lua script for atomicity.
 */
export declare function releaseLock(key: string, owner: string): Promise<boolean>;
export type { Redis };
//# sourceMappingURL=index.d.ts.map