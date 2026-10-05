import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getPrismaClient } from '../../infrastructure/database';
import { getRedisClient } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';

export class CitiesService {
  private static instance: CitiesService;
  private gdsAdapter: GdsAdapter;
  private citiesLogger = logger.child({ module: 'cities-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): CitiesService {
    if (!CitiesService.instance) {
      CitiesService.instance = new CitiesService();
    }
    return CitiesService.instance;
  }

  public async getCities(query?: string) {
    const cacheKey = `${RedisPrefix.CACHE_CITIES}gds`;
    let cities: Array<{ id: string; providerCityId: number; name: string }> = [];

    // 1. Try reading from Redis cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        cities = JSON.parse(cached);
      }
    } catch (err) {
      this.citiesLogger.warn({ err }, 'Redis error reading cities cache');
    }

    // 2. If not cached, fetch from database or sync from GDS
    if (cities.length === 0) {
      const prisma = getPrismaClient();
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
        const redis = getRedisClient();
        await redis.set(cacheKey, JSON.stringify(cities), 'EX', 24 * 60 * 60);
      } catch (cacheErr) {
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

  public async syncCities(): Promise<number> {
    const prisma = getPrismaClient();
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
      const redis = getRedisClient();
      await redis.del(`${RedisPrefix.CACHE_CITIES}gds`);
    } catch {
      // Ignore
    }

    this.citiesLogger.info({ count }, 'Successfully synced cities from GDS');
    return count;
  }
}
