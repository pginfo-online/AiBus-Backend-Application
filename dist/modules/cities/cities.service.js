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
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    cities = parsed;
                }
            }
        }
        catch (err) {
            this.citiesLogger.warn({ err }, 'Redis error reading cities cache');
        }
        // 2. If not cached, fetch directly from live GDS provider (/ota/CityList)
        if (!cities || cities.length === 0) {
            try {
                const gdsCities = await this.gdsAdapter.getCities();
                if (Array.isArray(gdsCities) && gdsCities.length > 0) {
                    cities = gdsCities.map((c) => ({
                        id: String(c.CityId),
                        providerCityId: c.CityId,
                        name: c.CityName,
                        City: c.CityName,
                        CityId: c.CityId,
                        State: c.State || '',
                    }));
                    // Cache for 24 hours in Redis as per Mantis API guidelines
                    try {
                        const redis = (0, redis_1.getRedisClient)();
                        await redis.set(cacheKey, JSON.stringify(cities), 'EX', 24 * 60 * 60);
                    }
                    catch (cacheErr) {
                        this.citiesLogger.warn({ cacheErr }, 'Failed to cache cities in Redis');
                    }
                }
            }
            catch (gdsErr) {
                this.citiesLogger.error({ gdsErr: gdsErr.message }, 'Live GDS provider failed to return cities');
                throw gdsErr;
            }
        }
        // 3. Filter by query if provided (case-insensitive autocomplete)
        if (query && query.trim()) {
            const q = query.toLowerCase().trim();
            return cities.filter((c) => (c.name || c.City || '').toLowerCase().includes(q));
        }
        return cities;
    }
    async syncCitiesSafe(gdsCities) {
        try {
            const prisma = (0, database_1.getPrismaClient)();
            for (const item of gdsCities) {
                if (!item.CityId || !item.CityName)
                    continue;
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
            }
        }
        catch (err) {
            this.citiesLogger.warn({ err: err.message }, 'Prisma DB sync failed');
        }
    }
    async syncCities() {
        this.citiesLogger.info('Syncing cities from GDS provider...');
        const gdsCities = await this.gdsAdapter.getCities();
        if (!Array.isArray(gdsCities) || gdsCities.length === 0) {
            return 0;
        }
        let count = 0;
        try {
            const prisma = (0, database_1.getPrismaClient)();
            for (const item of gdsCities) {
                if (!item.CityId || !item.CityName)
                    continue;
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
        }
        catch (err) {
            this.citiesLogger.warn({ err: err.message }, 'syncCities database upsert failed');
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