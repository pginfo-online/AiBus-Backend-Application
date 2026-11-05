import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getPrismaClient } from '../../infrastructure/database';
import { getRedisClient } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';
import { ProviderError } from '../../shared/errors';

type CityResult = { id: string; providerCityId: number; name: string; City: string; CityId: number; State?: string };

export class CitiesService {
  private static instance: CitiesService;
  private cityCache?: { rows: CityResult[]; expiresAt: number };
  private loadingCities?: Promise<CityResult[]>;
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

  private async loadCities(): Promise<CityResult[]> {
    const cacheKey = `${RedisPrefix.CACHE_CITIES}gds:v2`;
    const redis = getRedisClient();
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const rows = JSON.parse(cached);
        if (Array.isArray(rows) && rows.length) return rows;
      }
    } catch (err) {
      this.citiesLogger.warn({ err }, 'Redis city cache read failed');
    }

    try {
      const cities = await this.gdsAdapter.getCities();
      const seen = new Set<string>();
      const rows = cities.flatMap(({ CityId, CityName, State }) => {
        const key = `${CityId}:${CityName.toLowerCase()}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ id: String(CityId), providerCityId: CityId, name: CityName, City: CityName, CityId, State }];
      });
      try {
        await redis.set(cacheKey, JSON.stringify(rows), 'EX', 86400);
      } catch (err) {
        this.citiesLogger.warn({ err }, 'Redis city cache write failed');
      }
      return rows;
    } catch {
      if (this.cityCache?.rows.length) return this.cityCache.rows;
      const rows = await getPrismaClient().city.findMany({
        where: { active: true, providerName: 'GDS', providerCityId: { not: null } },
      });
      if (!rows.length) throw new ProviderError('GDS', 'City catalog unavailable');
      return rows.flatMap((city) => city.providerCityId === null ? [] : [{
        id: String(city.providerCityId), providerCityId: city.providerCityId,
        name: city.name, City: city.name, CityId: city.providerCityId, State: city.state ?? '',
      }]);
    }
  }

  public async getCities(query?: string, limit?: number, popular?: boolean) {
    if (!this.cityCache || this.cityCache.expiresAt <= Date.now()) {
      this.loadingCities ??= this.loadCities().then((rows) => {
        this.cityCache = { rows, expiresAt: Date.now() + 60_000 };
        return rows;
      }).finally(() => { this.loadingCities = undefined; });
      await this.loadingCities;
    }
    const cities = this.cityCache!.rows;

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

  public async syncCities(): Promise<number> {
    this.citiesLogger.info('Syncing cities from GDS provider...');
    const gdsCities = await this.gdsAdapter.getCities();
    if (!Array.isArray(gdsCities) || gdsCities.length === 0) {
      return 0;
    }

    let count = 0;
    try {
      const prisma = getPrismaClient();
      const synced = new Set<number>();
      for (const item of gdsCities) {
        if (!item.CityId || !item.CityName || synced.has(item.CityId)) continue;
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
    } catch (err: any) {
      this.citiesLogger.warn({ err: err.message }, 'syncCities database upsert failed');
    }

    this.cityCache = undefined;

    // Invalidate cache
    try {
      const redis = getRedisClient();
      await redis.del(`${RedisPrefix.CACHE_CITIES}gds:v2`);
    } catch {
      // Ignore
    }

    this.citiesLogger.info({ count }, 'Successfully synced cities from GDS');
    return count;
  }
}
