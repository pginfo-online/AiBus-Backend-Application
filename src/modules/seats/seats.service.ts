import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { getRedisClient } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { logger } from '../../infrastructure/logger';
import { GdsChartResponse } from '../../providers/types';

export class SeatsService {
  private static instance: SeatsService;
  private gdsAdapter: GdsAdapter;
  private seatsLogger = logger.child({ module: 'seats-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): SeatsService {
    if (!SeatsService.instance) {
      SeatsService.instance = new SeatsService();
    }
    return SeatsService.instance;
  }

  public async getSeatChart(busId: number): Promise<GdsChartResponse> {
    const cacheKey = `${RedisPrefix.CACHE_CHART}gds:${busId}`;

    // 1. Try Redis cache (2 min TTL)
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      this.seatsLogger.warn({ err }, 'Redis error reading seat chart cache');
    }

    // 2. Fetch from GDS upstream
    const chart = await this.gdsAdapter.getSeatChart(busId);

    // 3. Cache for 2 minutes (TTL 120 seconds)
    try {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(chart), 'EX', 120);
    } catch (cacheErr) {
      this.seatsLogger.warn({ cacheErr }, 'Failed to cache seat chart in Redis');
    }

    return chart;
  }
}
