import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Redis client — singleton with reconnection, error handling, health check
// ---------------------------------------------------------------------------

const redisLogger = logger.child({ module: 'redis' });

let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    password: env.REDIS_PASSWORD || undefined,
    tls: env.REDIS_TLS ? {} : undefined,
    keyPrefix: env.REDIS_KEY_PREFIX,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      redisLogger.warn({ attempt: times, delayMs: delay }, 'Redis reconnecting');
      return delay;
    },
    reconnectOnError(err: Error) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    enableReadyCheck: true,
    lazyConnect: true,
    enableOfflineQueue: false,
    commandTimeout: 1000,
    connectTimeout: 1500,
  });

  client.on('connect', () => {
    redisLogger.info('Redis connected');
  });

  client.on('ready', () => {
    redisLogger.info('Redis ready');
  });

  client.on('error', (err) => {
    redisLogger.error({ err }, 'Redis error');
  });

  client.on('close', () => {
    redisLogger.warn('Redis connection closed');
  });

  return client;
}

/**
 * Get the singleton Redis client. Creates one if it doesn't exist.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Create a new Redis connection for BullMQ.
 * BullMQ requires its own connections — do NOT reuse the shared client.
 */
export function createBullMQConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    password: env.REDIS_PASSWORD || undefined,
    tls: env.REDIS_TLS ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

/**
 * Connect the shared Redis client.
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
    redisLogger.info('Redis connected successfully');
  } catch (error) {
    // ioredis may already be connecting/connected
    if ((error as Error).message?.includes('already')) {
      redisLogger.debug('Redis already connected');
      return;
    }
    redisLogger.fatal({ err: error }, 'Failed to connect to Redis');
    throw error;
  }
}

/**
 * Disconnect the shared Redis client.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisLogger.info('Redis disconnected');
  }
}

/**
 * Health check — ping Redis.
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Distributed locking utilities
// ---------------------------------------------------------------------------

/**
 * Acquire a distributed lock using SET NX EX.
 * Returns true if acquired, false if already held.
 */
export async function acquireLock(
  key: string,
  owner: string,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.set(key, owner, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err: any) {
    redisLogger.warn(
      { err: err.message, key },
      'Redis unavailable for lock acquire; degrading gracefully to DB & provider checks'
    );
    return true; // Graceful degradation: allow proceeding to DB & provider checks
  }
}

/**
 * Release a distributed lock. Only releases if the owner matches.
 * Uses Lua script for atomicity.
 */
export async function releaseLock(key: string, owner: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await client.eval(luaScript, 1, key, owner);
    return result === 1;
  } catch (err: any) {
    redisLogger.warn({ err: err.message, key }, 'Redis unavailable for lock release');
    return false;
  }
}

export type { Redis };
