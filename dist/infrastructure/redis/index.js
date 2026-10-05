"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.createBullMQConnection = createBullMQConnection;
exports.connectRedis = connectRedis;
exports.disconnectRedis = disconnectRedis;
exports.checkRedisHealth = checkRedisHealth;
exports.acquireLock = acquireLock;
exports.releaseLock = releaseLock;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../../config/env");
const logger_1 = require("../logger");
// ---------------------------------------------------------------------------
// Redis client — singleton with reconnection, error handling, health check
// ---------------------------------------------------------------------------
const redisLogger = logger_1.logger.child({ module: 'redis' });
let redisClient = null;
function createRedisClient() {
    const client = new ioredis_1.default(env_1.env.REDIS_URL, {
        password: env_1.env.REDIS_PASSWORD || undefined,
        tls: env_1.env.REDIS_TLS ? {} : undefined,
        keyPrefix: env_1.env.REDIS_KEY_PREFIX,
        maxRetriesPerRequest: null, // Required for BullMQ
        retryStrategy(times) {
            const delay = Math.min(times * 200, 5000);
            redisLogger.warn({ attempt: times, delayMs: delay }, 'Redis reconnecting');
            return delay;
        },
        reconnectOnError(err) {
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
function getRedisClient() {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
}
/**
 * Create a new Redis connection for BullMQ.
 * BullMQ requires its own connections — do NOT reuse the shared client.
 */
function createBullMQConnection() {
    return new ioredis_1.default(env_1.env.REDIS_URL, {
        password: env_1.env.REDIS_PASSWORD || undefined,
        tls: env_1.env.REDIS_TLS ? {} : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
    });
}
/**
 * Connect the shared Redis client.
 */
async function connectRedis() {
    const client = getRedisClient();
    try {
        await client.connect();
        redisLogger.info('Redis connected successfully');
    }
    catch (error) {
        // ioredis may already be connecting/connected
        if (error.message?.includes('already')) {
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
async function disconnectRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        redisLogger.info('Redis disconnected');
    }
}
/**
 * Health check — ping Redis.
 */
async function checkRedisHealth() {
    try {
        const client = getRedisClient();
        const result = await client.ping();
        return result === 'PONG';
    }
    catch {
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
async function acquireLock(key, owner, ttlSeconds) {
    try {
        const client = getRedisClient();
        const result = await client.set(key, owner, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }
    catch (err) {
        redisLogger.warn({ err: err.message, key }, 'Redis unavailable for lock acquire; degrading gracefully to DB & provider checks');
        return true; // Graceful degradation: allow proceeding to DB & provider checks
    }
}
/**
 * Release a distributed lock. Only releases if the owner matches.
 * Uses Lua script for atomicity.
 */
async function releaseLock(key, owner) {
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
    }
    catch (err) {
        redisLogger.warn({ err: err.message, key }, 'Redis unavailable for lock release');
        return false;
    }
}
//# sourceMappingURL=index.js.map