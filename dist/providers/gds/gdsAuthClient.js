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
    refreshing;
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
        if (this.memoryToken && Date.now() < this.memoryTokenExpiresAt)
            return this.memoryToken;
        this.refreshing ??= this.refresh().finally(() => { this.refreshing = undefined; });
        return this.refreshing;
    }
    async refresh() {
        const tokenCacheKey = `${constants_1.RedisPrefix.PROVIDER_TOKEN}gds:v2:${env_1.env.GDS_CLIENT_ID}`;
        const lockKey = `${constants_1.RedisPrefix.LOCK_PROVIDER_AUTH}gds:v2:${env_1.env.GDS_CLIENT_ID}`;
        const lockOwner = `auth-${Date.now()}-${Math.random()}`;
        const redis = (0, redis_1.getRedisClient)();
        let lockAcquired = false;
        try {
            const deadline = Date.now() + Math.min(env_1.env.GDS_REQUEST_TIMEOUT_MS, 5000);
            do {
                const [cachedToken, ttl] = await Promise.all([redis.get(tokenCacheKey), redis.pttl(tokenCacheKey)]);
                if (cachedToken?.includes('|') && !cachedToken.startsWith('MOCK-') && !cachedToken.startsWith('DEV-') && ttl > 0) {
                    this.memoryToken = cachedToken;
                    this.memoryTokenExpiresAt = Date.now() + Math.min(ttl, 60_000);
                    return cachedToken;
                }
                lockAcquired = await (0, redis_1.acquireLock)(lockKey, lockOwner, Math.ceil(env_1.env.GDS_REQUEST_TIMEOUT_MS / 1000) + 5);
                if (lockAcquired)
                    break;
                await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 100));
            } while (Date.now() < deadline);
            if (!lockAcquired)
                throw new errors_1.AuthenticationError('GDS token refresh is in progress');
        }
        catch (err) {
            if (err instanceof errors_1.AuthenticationError)
                throw err;
            this.authLogger.warn('Redis unavailable for GDS token coordination');
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
            this.memoryTokenExpiresAt = Date.now() + ttlSeconds * 1000;
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
        try {
            this.authLogger.info('Requesting new GDS access token');
            const response = await axios_1.default.post(authUrl, {
                ClientId: Number(env_1.env.GDS_CLIENT_ID),
                ClientSecret: env_1.env.GDS_CLIENT_SECRET,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: env_1.env.GDS_REQUEST_TIMEOUT_MS,
                maxRedirects: 0,
            });
            // GDS returns the raw string token (or string within JSON)
            const token = typeof response.data === 'string' ? response.data.trim() : response.data;
            if (typeof token !== 'string' || !token.includes('|')) {
                throw new errors_1.AuthenticationError('GDS returned an invalid access token');
            }
            this.authLogger.info('Successfully acquired fresh GDS access token');
            return token;
        }
        catch (error) {
            this.authLogger.error({ error: error.message }, 'Failed to fetch GDS access token');
            throw new errors_1.AuthenticationError('Failed to authenticate with GDS provider');
        }
    }
}
exports.GdsAuthClient = GdsAuthClient;
//# sourceMappingURL=gdsAuthClient.js.map