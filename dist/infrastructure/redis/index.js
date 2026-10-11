"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_REDIS_RETRY_ATTEMPTS = void 0;
exports.handleRedisUnavailable = handleRedisUnavailable;
exports.isRedisAvailable = isRedisAvailable;
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
// Redis client — singleton with 5-retry strategy, failure handling & lifecycle
// ---------------------------------------------------------------------------
const redisLogger = logger_1.logger.child({ module: 'redis' });
exports.MAX_REDIS_RETRY_ATTEMPTS = 5;
let redisClient = null;
let isRedisHealthy = false;
let isShuttingDownRedis = false;
/**
 * Determine if TLS is required (either explicit REDIS_TLS=true or rediss:// protocol)
 */
function isTlsRequired() {
    return env_1.env.REDIS_TLS || env_1.env.REDIS_URL.startsWith('rediss://');
}
/**
 * Common connection options
 */
function getRedisBaseOptions() {
    const tlsNeeded = isTlsRequired();
    return {
        password: env_1.env.REDIS_PASSWORD || undefined,
        tls: tlsNeeded ? { rejectUnauthorized: false } : undefined,
        keyPrefix: env_1.env.REDIS_KEY_PREFIX,
        maxRetriesPerRequest: null, // Required for BullMQ compatibility
        enableReadyCheck: true,
        lazyConnect: true,
        enableOfflineQueue: false,
        commandTimeout: 2000,
        connectTimeout: 3000,
    };
}
/**
 * Reconnect strategy capped at 5 attempts with backoff
 */
function redisRetryStrategy(times) {
    if (times > exports.MAX_REDIS_RETRY_ATTEMPTS) {
        redisLogger.error({ attempts: times, maxRetries: exports.MAX_REDIS_RETRY_ATTEMPTS }, 'Redis reconnect limit reached (5 attempts); stopping automatic reconnects');
        return null; // Signals ioredis to stop retrying and emit 'end'
    }
    const delay = Math.min(times * 500, 3000);
    redisLogger.warn({ attempt: times, maxRetries: exports.MAX_REDIS_RETRY_ATTEMPTS, delayMs: delay }, 'Redis reconnecting...');
    return delay;
}
/**
 * Gracefully shuts down and cleans up Redis resources when retries are exhausted
 */
async function handleRedisUnavailable() {
    if (isShuttingDownRedis)
        return;
    isShuttingDownRedis = true;
    isRedisHealthy = false;
    redisLogger.warn('Gracefully shutting down Redis client after reaching retry limits. System operating in degraded mode.');
    if (redisClient) {
        try {
            redisClient.removeAllListeners();
            redisClient.disconnect();
        }
        catch (err) {
            redisLogger.debug({ err: err.message }, 'Error disconnecting exhausted Redis client');
        }
        redisClient = null;
    }
    isShuttingDownRedis = false;
}
function createRedisClient() {
    const client = new ioredis_1.default(env_1.env.REDIS_URL, {
        ...getRedisBaseOptions(),
        retryStrategy: redisRetryStrategy,
        reconnectOnError(err) {
            const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
            return targetErrors.some((e) => err.message.includes(e));
        },
    });
    client.on('connect', () => {
        isRedisHealthy = true;
        redisLogger.info('Redis connected');
    });
    client.on('ready', () => {
        isRedisHealthy = true;
        redisLogger.info('Redis ready for commands');
    });
    client.on('error', (err) => {
        isRedisHealthy = false;
        redisLogger.error({ err: err.message }, 'Redis error encountered');
    });
    client.on('close', () => {
        isRedisHealthy = false;
        redisLogger.warn('Redis connection closed');
    });
    client.on('end', () => {
        isRedisHealthy = false;
        redisLogger.warn('Redis connection ended (all retry attempts exhausted)');
        handleRedisUnavailable().catch(() => { });
    });
    return client;
}
/**
 * Returns true if Redis is currently connected, ready, and healthy
 */
function isRedisAvailable() {
    return isRedisHealthy && redisClient !== null && (redisClient.status === 'ready' || redisClient.status === 'connect');
}
/**
 * Get the singleton Redis client. Creates one lazily if it doesn't exist.
 */
function getRedisClient() {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
}
/**
 * Create a new isolated Redis connection for BullMQ.
 * BullMQ requires dedicated connections with error handlers attached.
 */
function createBullMQConnection() {
    const tlsNeeded = isTlsRequired();
    const connection = new ioredis_1.default(env_1.env.REDIS_URL, {
        password: env_1.env.REDIS_PASSWORD || undefined,
        tls: tlsNeeded ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: redisRetryStrategy,
    });
    // Guard against unhandled EventEmitter error crashes
    connection.on('error', (err) => {
        redisLogger.error({ err: err.message }, 'BullMQ Redis connection error');
    });
    return connection;
}
/**
 * Connect the shared Redis client with a robust 5-retry strategy.
 * Returns true if connection succeeded, false if Redis remains unavailable.
 */
async function connectRedis(maxAttempts = exports.MAX_REDIS_RETRY_ATTEMPTS) {
    const client = getRedisClient();
    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt++;
        try {
            if (client.status === 'wait') {
                await client.connect();
            }
            const pingResult = await client.ping();
            if (pingResult === 'PONG') {
                isRedisHealthy = true;
                redisLogger.info({ attempt }, 'Redis connected and verified successfully');
                return true;
            }
        }
        catch (error) {
            isRedisHealthy = false;
            const isAlreadyConnecting = error.message?.includes('already');
            if (isAlreadyConnecting) {
                try {
                    await client.ping();
                    isRedisHealthy = true;
                    return true;
                }
                catch {
                    // Continue with retry loop
                }
            }
            redisLogger.warn({ attempt, maxAttempts, err: error.message }, `Redis connection attempt ${attempt}/${maxAttempts} failed`);
            if (attempt >= maxAttempts) {
                break;
            }
            const delay = Math.min(attempt * 500, 2500);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    // Exhausted 5 attempts: handle failure gracefully according to critical dependencies
    redisLogger.error({ maxAttempts }, 'Redis connection could not be established after 5 attempts. Handling failure gracefully and shutting down connection.');
    await handleRedisUnavailable();
    return false;
}
/**
 * Gracefully disconnect the shared Redis client and free resources.
 */
async function disconnectRedis(timeoutMs = 3000) {
    isRedisHealthy = false;
    if (redisClient) {
        const client = redisClient;
        redisClient = null;
        try {
            client.removeAllListeners();
            if (client.status === 'ready' || client.status === 'connect') {
                const quitPromise = client.quit();
                const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
                await Promise.race([quitPromise, timeoutPromise]);
            }
            else {
                client.disconnect();
            }
            redisLogger.info('Redis connection closed gracefully');
        }
        catch (err) {
            redisLogger.warn({ err: err.message }, 'Error closing Redis client; forced disconnect');
            try {
                client.disconnect();
            }
            catch { }
        }
    }
}
/**
 * Health check — ping Redis with strict timeout.
 */
async function checkRedisHealth(timeoutMs = 2000) {
    if (!isRedisAvailable() || !redisClient) {
        return false;
    }
    try {
        const pingPromise = redisClient.ping();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timed out')), timeoutMs));
        const result = await Promise.race([pingPromise, timeoutPromise]);
        return result === 'PONG';
    }
    catch {
        return false;
    }
}
// ---------------------------------------------------------------------------
// Distributed locking utilities with graceful degradation
// ---------------------------------------------------------------------------
/**
 * Acquire a distributed lock using SET NX EX.
 * Gracefully degrades to true (proceeding) if Redis is offline.
 */
async function acquireLock(key, owner, ttlSeconds) {
    if (!isRedisAvailable()) {
        redisLogger.debug({ key }, 'Redis unavailable; skipping distributed lock (degrading gracefully to DB & provider checks)');
        return true; // Graceful degradation: allow proceeding to DB & provider checks
    }
    try {
        const client = getRedisClient();
        const result = await client.set(key, owner, 'EX', ttlSeconds, 'NX');
        return result === 'OK';
    }
    catch (err) {
        redisLogger.warn({ err: err.message, key }, 'Redis unavailable for lock acquire; degrading gracefully to DB & provider checks');
        return true;
    }
}
/**
 * Release a distributed lock. Only releases if the owner matches.
 */
async function releaseLock(key, owner) {
    if (!isRedisAvailable()) {
        return false;
    }
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