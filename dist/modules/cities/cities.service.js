"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesService = void 0;
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const database_1 = require("../../infrastructure/database");
const redis_1 = require("../../infrastructure/redis");
const constants_1 = require("../../shared/constants");
const logger_1 = require("../../infrastructure/logger");
class CitiesService {
    static instance;
    gdsAdapter;
    citiesLogger = logger_1.logger.child({ module: 'cities-service' });
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!CitiesService.instance) {
            CitiesService.instance = new CitiesService();
        }
        return CitiesService.instance;
    }
    async getCities(query) {
        const cacheKey = `${constants_1.RedisPrefix.CACHE_CITIES}gds`;
        let cities = [];
        // 1. Try reading from Redis cache
        try {
            const redis = (0, redis_1.getRedisClient)();
            const cached = await redis.get(cacheKey);
            if (cached) {
                cities = JSON.parse(cached);
            }
        }
        catch (err) {
            this.citiesLogger.warn({ err }, 'Redis error reading cities cache');
        }
        // 2. If not cached, fetch from database or sync from GDS
        if (cities.length === 0) {
            const prisma = (0, database_1.getPrismaClient)();
            let dbCities = await prisma.city.findMany({
                where: { active: true },
                select: { id: true, providerCityId: true, name: true },
                orderBy: { name: 'asc' },
            });
            if (dbCities.length === 0) {
                // Sync from GDS
                await this.syncCities();
                dbCities = await prisma.city.findMany({
                    where: { active: true },
                    select: { id: true, providerCityId: true, name: true },
                    orderBy: { name: 'asc' },
                });
            }
            cities = dbCities.map((c) => ({
                id: c.id,
                providerCityId: c.providerCityId || 0,
                name: c.name,
            }));
            // Cache for 24 hours
            try {
                const redis = (0, redis_1.getRedisClient)();
                await redis.set(cacheKey, JSON.stringify(cities), 'EX', 24 * 60 * 60);
            }
            catch (cacheErr) {
                this.citiesLogger.warn({ cacheErr }, 'Failed to cache cities in Redis');
            }
        }
        // 3. Filter by query if provided (case-insensitive autocomplete)
        if (query && query.trim()) {
            const q = query.toLowerCase().trim();
            return cities.filter((c) => c.name.toLowerCase().includes(q));
        }
        return cities;
    }
    async syncCities() {
        const prisma = (0, database_1.getPrismaClient)();
        this.citiesLogger.info('Syncing cities from GDS provider...');
        const gdsCities = await this.gdsAdapter.getCities();
        let count = 0;
        for (const item of gdsCities) {
            await prisma.city.upsert({
                where: {
                    providerName_providerCityId: {
                        providerName: 'GDS',
                        providerCityId: item.CityId,
                    },
                },
                update: {
                    name: item.CityName,
                    active: true,
                },
                create: {
                    name: item.CityName,
                    providerCityId: item.CityId,
                    providerName: 'GDS',
                    active: true,
                },
            });
            count++;
        }
        // Invalidate cache
        try {
            const redis = (0, redis_1.getRedisClient)();
            await redis.del(`${constants_1.RedisPrefix.CACHE_CITIES}gds`);
        }
        catch {
            // Ignore
        }
        this.citiesLogger.info({ count }, 'Successfully synced cities from GDS');
        return count;
    }
}
exports.CitiesService = CitiesService;
//# sourceMappingURL=cities.service.js.map