import axios from 'axios';
import { env } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { getRedisClient, acquireLock, releaseLock } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { AuthenticationError } from '../../shared/errors';

export class GdsAuthClient {
  private static instance: GdsAuthClient;
  private readonly authLogger = logger.child({ module: 'gds-auth' });
  private refreshing?: Promise<string>;
  private memoryToken: string | null = null;
  private memoryTokenExpiresAt: number = 0;

  private constructor() {}

  public static getInstance(): GdsAuthClient {
    if (!GdsAuthClient.instance) {
      GdsAuthClient.instance = new GdsAuthClient();
    }
    return GdsAuthClient.instance;
  }

  public async getAccessToken(): Promise<string> {
    if (this.memoryToken && Date.now() < this.memoryTokenExpiresAt) return this.memoryToken;
    this.refreshing ??= this.refresh().finally(() => { this.refreshing = undefined; });
    return this.refreshing;
  }

  private async refresh(): Promise<string> {
    const tokenCacheKey = `${RedisPrefix.PROVIDER_TOKEN}gds:v2:${env.GDS_CLIENT_ID}`;
    const lockKey = `${RedisPrefix.LOCK_PROVIDER_AUTH}gds:v2:${env.GDS_CLIENT_ID}`;
    const lockOwner = `auth-${Date.now()}-${Math.random()}`;
    const redis = getRedisClient();
    let lockAcquired = false;
    try {
      const deadline = Date.now() + Math.min(env.GDS_REQUEST_TIMEOUT_MS, 5000);
      do {
        const [cachedToken, ttl] = await Promise.all([redis.get(tokenCacheKey), redis.pttl(tokenCacheKey)]);
        if (cachedToken?.includes('|') && !cachedToken.startsWith('MOCK-') && !cachedToken.startsWith('DEV-') && ttl > 0) {
          this.memoryToken = cachedToken;
          this.memoryTokenExpiresAt = Date.now() + Math.min(ttl, 60_000);
          return cachedToken;
        }
        lockAcquired = await acquireLock(lockKey, lockOwner, Math.ceil(env.GDS_REQUEST_TIMEOUT_MS / 1000) + 5);
        if (lockAcquired) break;
        await new Promise((resolve) => setTimeout(resolve, 150 + Math.random() * 100));
      } while (Date.now() < deadline);
      if (!lockAcquired) throw new AuthenticationError('GDS token refresh is in progress');
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      this.authLogger.warn('Redis unavailable for GDS token coordination');
    }

    try {
      // 4. Fetch token from GDS Partner API
      const token = await this.fetchTokenFromUpstream();

      // Cache for 80 minutes (GDS token is valid for 90 minutes)
      const ttlSeconds = 80 * 60;
      try {
        const redis = getRedisClient();
        await redis.set(tokenCacheKey, token, 'EX', ttlSeconds);
      } catch (cacheErr) {
        this.authLogger.warn({ cacheErr }, 'Could not save token to Redis');
      }

      this.memoryToken = token;
      this.memoryTokenExpiresAt = Date.now() + ttlSeconds * 1000;
      return token;
    } finally {
      if (lockAcquired) {
        try {
          await releaseLock(lockKey, lockOwner);
        } catch (releaseErr) {
          this.authLogger.warn({ releaseErr }, 'Could not release auth lock');
        }
      }
    }
  }

  private async fetchTokenFromUpstream(): Promise<string> {
    const authUrl = `${env.GDS_PARTNER_BASE_URL}/ota/v1/Auth`;


    try {
      this.authLogger.info( 'Requesting new GDS access token');

      const response = await axios.post(
        authUrl,
        {
          ClientId: Number(env.GDS_CLIENT_ID),
          ClientSecret: env.GDS_CLIENT_SECRET,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: env.GDS_REQUEST_TIMEOUT_MS,
          maxRedirects: 0,
        }
      );

      // GDS returns the raw string token (or string within JSON)
      const token = typeof response.data === 'string' ? response.data.trim() : response.data;

      if (typeof token !== 'string' || !token.includes('|')) {
        throw new AuthenticationError('GDS returned an invalid access token');
      }

      this.authLogger.info('Successfully acquired fresh GDS access token');
      return token;
    } catch (error: any) {
      this.authLogger.error({ error: error.message }, 'Failed to fetch GDS access token');


      throw new AuthenticationError('Failed to authenticate with GDS provider');
    }
  }
}
