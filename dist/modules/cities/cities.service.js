"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesService = void 0;
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const database_1 = require("../../infrastructure/database");
const redis_1 = require("../../infrastructure/redis");
const constants_1 = require("../../shared/constants");
const logger_1 = require("../../infrastructure/logger");
const errors_1 = require("../../shared/errors");
class CitiesService {
    static instance;
    cityCache;
    loadingCities;
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
    async loadCities() {
        const cacheKey = `${constants_1.RedisPrefix.CACHE_CITIES}gds:v2`;
        const redis = (0, redis_1.getRedisClient)();
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const rows = JSON.parse(cached);
                if (Array.isArray(rows) && rows.length)
                    return rows;
            }
        }
        catch (err) {
            this.citiesLogger.warn({ err }, 'Redis city cache read failed');
        }
        try {
            const cities = await this.gdsAdapter.getCities();
            const seen = new Set();
            const rows = cities.flatMap(({ CityId, CityName, State }) => {
                const key = `${CityId}:${CityName.toLowerCase()}`;
                if (seen.has(key))
                    return [];
                seen.add(key);
                return [{ id: String(CityId), providerCityId: CityId, name: CityName, City: CityName, CityId, State }];
            });
            try {
                await redis.set(cacheKey, JSON.stringify(rows), 'EX', 86400);
            }
            catch (err) {
                this.citiesLogger.warn({ err }, 'Redis city cache write failed');
            }
            return rows;
        }
        catch {
            if (this.cityCache?.rows.length)
                return this.cityCache.rows;
            const rows = await (0, database_1.getPrismaClient)().city.findMany({
                where: { active: true, providerName: 'GDS', providerCityId: { not: null } },
            });
            if (!rows.length)
                throw new errors_1.ProviderError('GDS', 'City catalog unavailable');
            return rows.flatMap((city) => city.providerCityId === null ? [] : [{
                    id: String(city.providerCityId), providerCityId: city.providerCityId,
                    name: city.name, City: city.name, CityId: city.providerCityId, State: city.state ?? '',
                }]);
        }
    }
    async getCities(query, limit, popular) {
        if (!this.cityCache || this.cityCache.expiresAt <= Date.now()) {
            this.loadingCities ??= this.loadCities().then((rows) => {
                this.cityCache = { rows, expiresAt: Date.now() + 60_000 };
                return rows;
            }).finally(() => { this.loadingCities = undefined; });
            await this.loadingCities;
        }
        const cities = this.cityCache.rows;
        // Curated high-priority popular cities (matching UI reference ref-1 and ref-3)
        const POPULAR_KEYS = [
            'hyderabad',
            'bengaluru',
            'bangalore',
            'chennai',
            'madras',
            'goa',
            'vijayawada',
            'nellore',
            'pune',
            'mumbai',
            'bombay',
            'delhi',
            'latur',
            'coimbatore',
            'visakhapatnam',
            'ahmedabad',
            'jaipur',
            'indore',
            'nagpur',
        ];
        if (popular) {
            const popularMatches = [];
            for (const key of POPULAR_KEYS) {
                const found = cities.find((c) => (c.name || c.City || '').toLowerCase().includes(key));
                if (found && !popularMatches.some((m) => m.CityId === found.CityId)) {
                    popularMatches.push(found);
                }
            }
            return limit ? popularMatches.slice(0, limit) : popularMatches;
        }
        // 3. Filter by query if provided (prefix match prioritized, then substring, then state)
        if (query && query.trim()) {
            const q = query.toLowerCase().trim();
            const prefixMatches = [];
            const containsMatches = [];
            const stateMatches = [];
            for (const c of cities) {
                const cityName = (c.name || c.City || '').toLowerCase();
                const stateName = (c.State || '').toLowerCase();
                if (cityName.startsWith(q)) {
                    prefixMatches.push(c);
                }
                else if (cityName.includes(q)) {
                    containsMatches.push(c);
                }
                else if (stateName.startsWith(q) || stateName.includes(q)) {
                    stateMatches.push(c);
                }
            }
            const combined = [...prefixMatches, ...containsMatches, ...stateMatches];
            return limit ? combined.slice(0, limit) : combined;
        }
        // If limit is specified without query, return popular cities first, then others up to limit
        if (limit) {
            const popularMatches = [];
            const otherCities = [];
            for (const c of cities) {
                const cityName = (c.name || c.City || '').toLowerCase();
                if (POPULAR_KEYS.some((pk) => cityName.includes(pk))) {
                    if (!popularMatches.some((m) => m.CityId === c.CityId)) {
                        popularMatches.push(c);
                    }
                }
                else {
                    otherCities.push(c);
                }
            }
            return [...popularMatches, ...otherCities].slice(0, limit);
        }
        return cities;
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
            const synced = new Set();
            for (const item of gdsCities) {
                if (!item.CityId || !item.CityName || synced.has(item.CityId))
                    continue;
                synced.add(item.CityId);
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
        this.cityCache = undefined;
        // Invalidate cache
        try {
            const redis = (0, redis_1.getRedisClient)();
            await redis.del(`${constants_1.RedisPrefix.CACHE_CITIES}gds:v2`);
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