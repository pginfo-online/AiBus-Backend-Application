import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getPrismaClient } from '../../infrastructure/database';
import { getRedisClient } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';
import { MOCK_CITIES } from '../../providers/gds/gdsMockData';
import { GdsCity } from '../../providers/types';

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
    let cities: Array<{ id: string; providerCityId: number; name: string; City: string; CityId: number; State?: string }> = [];

    // 1. Try reading from Redis cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cities = parsed;
        }
      }
    } catch (err) {
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
            const redis = getRedisClient();
            await redis.set(cacheKey, JSON.stringify(cities), 'EX', 24 * 60 * 60);
          } catch (cacheErr) {
            this.citiesLogger.warn({ cacheErr }, 'Failed to cache cities in Redis');
          }
        }
      } catch (gdsErr: any) {
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

  private async syncCitiesSafe(gdsCities: Array<{ CityId: number; CityName: string }>): Promise<void> {
    try {
      const prisma = getPrismaClient();
      for (const item of gdsCities) {
        if (!item.CityId || !item.CityName) continue;
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
    } catch (err: any) {
      this.citiesLogger.warn({ err: err.message }, 'Prisma DB sync failed');
    }
  }

  public async syncCities(): Promise<number> {
    this.citiesLogger.info('Syncing cities from GDS provider...');
    const gdsCities = await this.gdsAdapter.getCities();
    if (!Array.isArray(gdsCities) || gdsCities.length === 0) {
      return 0;
    }

    let count = 0;
    try {
      const prisma = getPrismaClient();
      for (const item of gdsCities) {
        if (!item.CityId || !item.CityName) continue;
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
    } catch (err: any) {
      this.citiesLogger.warn({ err: err.message }, 'syncCities database upsert failed');
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
