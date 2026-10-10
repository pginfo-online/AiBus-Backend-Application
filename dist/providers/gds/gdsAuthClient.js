"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GdsAuthClient = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const logger_1 = require("../../infrastructure/logger");
const redis_1 = require("../../infrastructure/redis");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
class GdsAuthClient {
    static instance;
    authLogger = logger_1.logger.child({ module: 'gds-auth' });
    memoryToken = null;
    memoryTokenExpiresAt = 0;
    constructor() { }
    static getInstance() {
        if (!GdsAuthClient.instance) {
            GdsAuthClient.instance = new GdsAuthClient();
        }
        return GdsAuthClient.instance;
    }
    async getAccessToken() {
        const tokenCacheKey = `${constants_1.RedisPrefix.PROVIDER_TOKEN}gds`;
        const lockKey = `${constants_1.RedisPrefix.LOCK_PROVIDER_AUTH}gds`;
        const lockOwner = `auth-${Date.now()}-${Math.random()}`;
        // 1. Check in-memory cache first
        const now = Date.now();
        if (this.memoryToken && now < this.memoryTokenExpiresAt) {
            return this.memoryToken;
        }
        // 2. Check Redis cache
        try {
            const redis = (0, redis_1.getRedisClient)();
            const cachedToken = await redis.get(tokenCacheKey);
            if (cachedToken) {
                this.memoryToken = cachedToken;
                this.memoryTokenExpiresAt = now + 60 * 1000; // 1 min local cache
                return cachedToken;
            }
        }
        catch (err) {
            this.authLogger.warn({ err }, 'Redis error while reading cached GDS token; proceeding to fetch fresh token');
        }
        // 3. Acquire distributed lock so only ONE request calls the GDS Auth endpoint
        let lockAcquired = false;
        try {
            lockAcquired = await (0, redis_1.acquireLock)(lockKey, lockOwner, 10);
        }
        catch (lockErr) {
            this.authLogger.warn({ lockErr }, 'Could not acquire Redis auth lock, fetching directly');
        }
        if (!lockAcquired) {
            // Another process is refreshing the token. Wait 500ms and check cache again.
            await new Promise((resolve) => setTimeout(resolve, 500));
            try {
                const redis = (0, redis_1.getRedisClient)();
                const cachedToken = await redis.get(tokenCacheKey);
                if (cachedToken) {
                    return cachedToken;
                }
            }
            catch {
                // Continue to fetch
            }
        }
        try {
            // 4. Fetch token from GDS Partner API
            const token = await this.fetchTokenFromUpstream();
            // Cache for 80 minutes (GDS token is valid for 90 minutes)
            const ttlSeconds = 80 * 60;
            try {
                const redis = (0, redis_1.getRedisClient)();
                await redis.set(tokenCacheKey, token, 'EX', ttlSeconds);
            }
            catch (cacheErr) {
                this.authLogger.warn({ cacheErr }, 'Could not save token to Redis');
            }
            this.memoryToken = token;
            this.memoryTokenExpiresAt = now + ttlSeconds * 1000;
            return token;
        }
        finally {
            if (lockAcquired) {
                try {
                    await (0, redis_1.releaseLock)(lockKey, lockOwner);
                }
                catch (releaseErr) {
                    this.authLogger.warn({ releaseErr }, 'Could not release auth lock');
                }
            }
        }
    }
    async fetchTokenFromUpstream() {
        const authUrl = `${env_1.env.GDS_PARTNER_BASE_URL}/ota/v1/Auth`;
        // In development or test, if mock secret is provided, avoid hitting live endpoint if mock credentials are set
        if (env_1.env.GDS_CLIENT_SECRET.includes('sandbox') || env_1.env.GDS_CLIENT_SECRET.includes('test') || env_1.isTest) {
            this.authLogger.info('Using local simulated GDS access token for development/sandbox credentials');
            return `MOCK-GDS-TOKEN-${Date.now()}|${env_1.env.GDS_CLIENT_ID}-S|202610051210|prod|FFFF`;
        }
        try {
            this.authLogger.info({ url: authUrl, clientId: env_1.env.GDS_CLIENT_ID }, 'Requesting new GDS access token');
            const response = await axios_1.default.post(authUrl, {
                ClientId: env_1.env.GDS_CLIENT_ID,
                ClientSecret: env_1.env.GDS_CLIENT_SECRET,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: env_1.env.GDS_REQUEST_TIMEOUT_MS,
            });
            // GDS returns the raw string token (or string within JSON)
            const token = typeof response.data === 'string' ? response.data.trim() : response.data;
            if (!token) {
                throw new errors_1.AuthenticationError('GDS returned empty access token');
            }
            this.authLogger.info('Successfully acquired fresh GDS access token');
            return token;
        }
        catch (error) {
            this.authLogger.error({ error: error.message }, 'Failed to fetch GDS access token');
            if (env_1.isDevelopment || env_1.isTest) {
                this.authLogger.warn('Falling back to local development simulated token due to upstream error');
                return `DEV-FALLBACK-TOKEN-${Date.now()}|${env_1.env.GDS_CLIENT_ID}-S|202610051210|prod|FFFF`;
            }
            throw new errors_1.AuthenticationError(`Failed to authenticate with GDS provider: ${error.response?.data?.message || error.message}`);
        }
    }
}
exports.GdsAuthClient = GdsAuthClient;
//# sourceMappingURL=gdsAuthClient.js.map