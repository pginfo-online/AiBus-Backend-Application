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

  public async getCities(query?: string, limit?: number, popular?: boolean) {
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
        this.citiesLogger.error({ gdsErr: gdsErr.message }, 'Live GDS provider failed to return cities, checking DB/fallback');
        try {
          const prisma = getPrismaClient();
          const dbCities = await prisma.city.findMany({ where: { active: true } });
          if (dbCities.length > 0) {
            cities = dbCities.map((c) => ({
              id: String(c.providerCityId || c.id),
              providerCityId: c.providerCityId ?? 0,
              name: c.name,
              City: c.name,
              CityId: c.providerCityId ?? 0,
              State: c.state || '',
            }));
          }
        } catch (dbErr) {
          this.citiesLogger.warn({ dbErr }, 'DB fallback failed for cities');
        }

        if (!cities || cities.length === 0) {
          cities = MOCK_CITIES.map((c) => ({
            id: String(c.CityId),
            providerCityId: c.CityId,
            name: c.CityName,
            City: c.CityName,
            CityId: c.CityId,
            State: c.State || '',
          }));
        }
      }
    }

    // Deduplicate cities by providerCityId and name
    const seenCityKeys = new Set<string>();
    const deduplicatedCities: typeof cities = [];
    for (const c of cities) {
      const key = `${c.providerCityId || c.CityId}-${(c.name || c.City || '').toLowerCase().trim()}`;
      if (!seenCityKeys.has(key)) {
        seenCityKeys.add(key);
        deduplicatedCities.push(c);
      }
    }
    cities = deduplicatedCities;

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
      const popularMatches: typeof cities = [];
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
      const prefixMatches: typeof cities = [];
      const containsMatches: typeof cities = [];
      const stateMatches: typeof cities = [];

      for (const c of cities) {
        const cityName = (c.name || c.City || '').toLowerCase();
        const stateName = (c.State || '').toLowerCase();

        if (cityName.startsWith(q)) {
          prefixMatches.push(c);
        } else if (cityName.includes(q)) {
          containsMatches.push(c);
        } else if (stateName.startsWith(q) || stateName.includes(q)) {
          stateMatches.push(c);
        }
      }

      const combined = [...prefixMatches, ...containsMatches, ...stateMatches];
      return limit ? combined.slice(0, limit) : combined;
    }

    // If limit is specified without query, return popular cities first, then others up to limit
    if (limit) {
      const popularMatches: typeof cities = [];
      const otherCities: typeof cities = [];

      for (const c of cities) {
        const cityName = (c.name || c.City || '').toLowerCase();
        if (POPULAR_KEYS.some((pk) => cityName.includes(pk))) {
          if (!popularMatches.some((m) => m.CityId === c.CityId)) {
            popularMatches.push(c);
          }
        } else {
          otherCities.push(c);
        }
      }

      return [...popularMatches, ...otherCities].slice(0, limit);
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
