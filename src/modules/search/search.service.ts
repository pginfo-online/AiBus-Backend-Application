import crypto from 'crypto';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { CitiesService } from '../cities/cities.service';
import { getRedisClient } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';
import { SearchBusesQuery } from './search.validation';
import { GdsBusSearchResult } from '../../providers/types';

export class SearchService {
  private static instance: SearchService;
  private gdsAdapter: GdsAdapter;
  private searchLogger = logger.child({ module: 'search-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  private async resolveCityNames(fromCityId: number, toCityId: number): Promise<{ fromCityName: string; toCityName: string }> {
    const commonCityMap: Record<number, string> = {
      4292: 'Bengaluru',
      4562: 'Chennai',
      6772: 'Pune',
      4492: 'Pune',
      19: 'Pune',
      4300: 'Mumbai',
      18: 'Mumbai',
      4120: 'Hyderabad',
      23: 'Hyderabad',
      1: 'Delhi',
      2: 'Jaipur',
      3: 'Agra',
      4: 'Dehradun',
      5: 'Chandigarh',
      6: 'Manali',
      7: 'Shimla',
      8: 'Haridwar',
      9: 'Rishikesh',
      10: 'Lucknow',
      11: 'Varanasi',
      12: 'Kanpur',
      13: 'Prayagraj',
      14: 'Ahmedabad',
      15: 'Surat',
      16: 'Vadodara',
      17: 'Rajkot',
      20: 'Nagpur',
      21: 'Nashik',
      22: 'Goa',
      24: 'Vijayawada',
      25: 'Visakhapatnam',
      26: 'Kochi',
      27: 'Trivandrum',
      28: 'Coimbatore',
      29: 'Madurai',
      30: 'Mysuru',
      31: 'Tirupati',
      32: 'Mangalore',
    };

    let fromCityName = commonCityMap[Number(fromCityId)] || 'Origin';
    let toCityName = commonCityMap[Number(toCityId)] || 'Destination';

    try {
      const cities = await CitiesService.getInstance().getCities();
      const fromMatch = cities.find((c) => Number(c.CityId || c.providerCityId) === Number(fromCityId));
      if (fromMatch) fromCityName = fromMatch.name || fromMatch.City;
      const toMatch = cities.find((c) => Number(c.CityId || c.providerCityId) === Number(toCityId));
      if (toMatch) toCityName = toMatch.name || toMatch.City;
    } catch (err: any) {
      this.searchLogger.warn({ err: err.message }, 'Failed to resolve city names from CitiesService, using fallback');
    }

    return { fromCityName, toCityName };
  }

  public async searchBuses(query: SearchBusesQuery): Promise<{ results: GdsBusSearchResult[]; total: number; fromCityId?: number; toCityId?: number; fromCityName?: string; toCityName?: string; from?: string; to?: string }> {
    const rawCacheKey = `${query.fromCityId}:${query.toCityId}:${query.journeyDate}`;
    const hash = crypto.createHash('md5').update(rawCacheKey).digest('hex');
    const cacheKey = `${RedisPrefix.CACHE_SEARCH}gds:${hash}`;

    let buses: GdsBusSearchResult[] = [];

    // 1. Try cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          buses = parsed;
        } else {
          this.searchLogger.warn({ cacheKey }, 'Invalid bus search cache value; refreshing from provider');
        }
      }
    } catch (err) {
      this.searchLogger.warn({ err }, 'Redis error reading bus search cache');
    }

    // 2. Fetch from upstream GDS provider if cache miss
    if (buses.length === 0) {
      buses = await this.gdsAdapter.searchBuses({
        fromCityId: query.fromCityId,
        toCityId: query.toCityId,
        journeyDate: query.journeyDate,
      });

      // Cache for 5 minutes (TTL 300 seconds)
      try {
        const redis = getRedisClient();
        await redis.set(cacheKey, JSON.stringify(buses), 'EX', 300);
      } catch (cacheErr) {
        this.searchLogger.warn({ cacheErr }, 'Failed to cache bus search in Redis');
      }
    }

    // 3. Apply filters
    let filtered = [...buses];

    if (query.isAC !== undefined) {
      filtered = filtered.filter((b) => b.IsAC === query.isAC);
    }

    if (query.isSleeper !== undefined) {
      filtered = filtered.filter((b) => b.IsSleeper === query.isSleeper);
    }

    if (query.operator) {
      const op = query.operator.toLowerCase();
      filtered = filtered.filter((b) => b.CompanyName.toLowerCase().includes(op));
    }

    if (query.minFare !== undefined) {
      filtered = filtered.filter((b) => b.TotalFare >= query.minFare!);
    }

    if (query.maxFare !== undefined) {
      filtered = filtered.filter((b) => b.TotalFare <= query.maxFare!);
    }

    // 4. Apply sorting
    if (query.sortBy) {
      switch (query.sortBy) {
        case 'fare_asc':
          filtered.sort((a, b) => a.TotalFare - b.TotalFare);
          break;
        case 'fare_desc':
          filtered.sort((a, b) => b.TotalFare - a.TotalFare);
          break;
        case 'departure_asc':
          filtered.sort((a, b) => a.DepartureTime.localeCompare(b.DepartureTime));
          break;
        case 'departure_desc':
          filtered.sort((a, b) => b.DepartureTime.localeCompare(a.DepartureTime));
          break;
      }
    }

    const { fromCityName, toCityName } = await this.resolveCityNames(query.fromCityId, query.toCityId);

    const enrichedResults = filtered.map((b) => {
      const baseFare = Number(b.BaseFare || b.TotalFare || 0);
      const totalFare = Number(b.TotalFare || b.BaseFare || 0);
      const serviceTax = Number(b.ServiceTax ?? Math.max(0, totalFare - baseFare));
      return {
        ...b,
        BaseFare: baseFare,
        TotalFare: totalFare,
        ServiceTax: serviceTax,
        price: totalFare,
        fare: totalFare,
        FromCityId: query.fromCityId,
        ToCityId: query.toCityId,
        FromCityName: fromCityName,
        ToCityName: toCityName,
        FromName: fromCityName,
        ToName: toCityName,
        from: fromCityName,
        to: toCityName,
      };
    });

    return {
      fromCityId: query.fromCityId,
      toCityId: query.toCityId,
      fromCityName,
      toCityName,
      from: fromCityName,
      to: toCityName,
      results: enrichedResults,
      total: enrichedResults.length,
    };
  }

  public async searchSingleBus(query: {
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
    busId: number;
  }): Promise<{ results: GdsBusSearchResult[]; total: number; fromCityId?: number; toCityId?: number; fromCityName?: string; toCityName?: string; from?: string; to?: string }> {
    const rawCacheKey = `single:${query.busId}:${query.fromCityId}:${query.toCityId}:${query.journeyDate}`;
    const hash = crypto.createHash('md5').update(rawCacheKey).digest('hex');
    const cacheKey = `${RedisPrefix.CACHE_SEARCH}gds:${hash}`;

    let buses: GdsBusSearchResult[] = [];

    // 1. Try cache
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed: unknown = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          buses = parsed;
        }
      }
    } catch (err) {
      this.searchLogger.warn({ err }, 'Redis error reading single bus search cache');
    }

    // 2. Fetch from upstream GDS provider if cache miss
    if (buses.length === 0) {
      try {
        buses = await this.gdsAdapter.searchBus({
          busId: query.busId,
          fromCityId: query.fromCityId,
          toCityId: query.toCityId,
          journeyDate: query.journeyDate,
        });

        if (Array.isArray(buses) && buses.length > 0) {
          try {
            const redis = getRedisClient();
            await redis.set(cacheKey, JSON.stringify(buses), 'EX', 300);
          } catch (cacheErr) {
            this.searchLogger.warn({ cacheErr }, 'Failed to cache single bus search in Redis');
          }
        }
      } catch (err: any) {
        this.searchLogger.warn({ err: err.message, query }, 'GDS SearchBus failed, trying full search fallback');
        // Fallback: search all buses for the route and filter by busId
        const fullSearch = await this.searchBuses({
          fromCityId: query.fromCityId,
          toCityId: query.toCityId,
          journeyDate: query.journeyDate,
        });
        const match = fullSearch.results.find(
          (b) => b.RouteBusId === query.busId || String(b.TripId) === String(query.busId)
        );
        if (match) {
          buses = [match];
        }
      }
    }

    const { fromCityName, toCityName } = await this.resolveCityNames(query.fromCityId, query.toCityId);

    const enrichedBuses = buses.map((b) => {
      const baseFare = Number(b.BaseFare || b.TotalFare || 0);
      const totalFare = Number(b.TotalFare || b.BaseFare || 0);
      const serviceTax = Number(b.ServiceTax ?? Math.max(0, totalFare - baseFare));
      return {
        ...b,
        BaseFare: baseFare,
        TotalFare: totalFare,
        ServiceTax: serviceTax,
        price: totalFare,
        fare: totalFare,
        FromCityId: query.fromCityId,
        ToCityId: query.toCityId,
        FromCityName: fromCityName,
        ToCityName: toCityName,
        FromName: fromCityName,
        ToName: toCityName,
        from: fromCityName,
        to: toCityName,
      };
    });

    return {
      fromCityId: query.fromCityId,
      toCityId: query.toCityId,
      fromCityName,
      toCityName,
      from: fromCityName,
      to: toCityName,
      results: enrichedBuses,
      total: enrichedBuses.length,
    };
  }
}
