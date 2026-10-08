import crypto from 'crypto';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
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

  public async searchBuses(query: SearchBusesQuery): Promise<{ results: GdsBusSearchResult[]; total: number }> {
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

    return {
      results: filtered,
      total: filtered.length,
    };
  }

  public async searchSingleBus(query: {
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
    busId: number;
  }): Promise<{ results: GdsBusSearchResult[]; total: number }> {
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

    return {
      results: buses,
      total: buses.length,
    };
  }
}
