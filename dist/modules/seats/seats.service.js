"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatsService = void 0;
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const redis_1 = require("../../infrastructure/redis");
const constants_1 = require("../../shared/constants");
const logger_1 = require("../../infrastructure/logger");
class SeatsService {
    static instance;
    gdsAdapter;
    seatsLogger = logger_1.logger.child({ module: 'seats-service' });
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!SeatsService.instance) {
            SeatsService.instance = new SeatsService();
        }
        return SeatsService.instance;
    }
    async getSeatChart(busId) {
        const cacheKey = `${constants_1.RedisPrefix.CACHE_CHART}gds:${busId}`;
        // 1. Try Redis cache (2 min TTL)
        try {
            const redis = (0, redis_1.getRedisClient)();
            const cached = await redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        }
        catch (err) {
            this.seatsLogger.warn({ err }, 'Redis error reading seat chart cache');
        }
        // 2. Fetch from GDS upstream
        const chart = await this.gdsAdapter.getSeatChart(busId);
        // 3. Cache for 2 minutes (TTL 120 seconds)
        try {
            const redis = (0, redis_1.getRedisClient)();
            await redis.set(cacheKey, JSON.stringify(chart), 'EX', 120);
        }
        catch (cacheErr) {
            this.seatsLogger.warn({ cacheErr }, 'Failed to cache seat chart in Redis');
        }
        return chart;
    }
}
exports.SeatsService = SeatsService;
//# sourceMappingURL=seats.service.js.map