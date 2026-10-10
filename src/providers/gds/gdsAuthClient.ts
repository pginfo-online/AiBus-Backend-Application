import axios from 'axios';
import { env, isDevelopment, isTest } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { getRedisClient, acquireLock, releaseLock } from '../../infrastructure/redis';
import { RedisPrefix } from '../../shared/constants';
import { AuthenticationError } from '../../shared/errors';

export class GdsAuthClient {
  private static instance: GdsAuthClient;
  private readonly authLogger = logger.child({ module: 'gds-auth' });
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
    const tokenCacheKey = `${RedisPrefix.PROVIDER_TOKEN}gds`;
    const lockKey = `${RedisPrefix.LOCK_PROVIDER_AUTH}gds`;
    const lockOwner = `auth-${Date.now()}-${Math.random()}`;

    // 1. Check in-memory cache first
    const now = Date.now();
    if (this.memoryToken && now < this.memoryTokenExpiresAt) {
      return this.memoryToken;
    }

    // 2. Check Redis cache
    try {
      const redis = getRedisClient();
      const cachedToken = await redis.get(tokenCacheKey);
      if (cachedToken) {
        this.memoryToken = cachedToken;
        this.memoryTokenExpiresAt = now + 60 * 1000; // 1 min local cache
        return cachedToken;
      }
    } catch (err) {
      this.authLogger.warn({ err }, 'Redis error while reading cached GDS token; proceeding to fetch fresh token');
    }

    // 3. Acquire distributed lock so only ONE request calls the GDS Auth endpoint
    let lockAcquired = false;
    try {
      lockAcquired = await acquireLock(lockKey, lockOwner, 10);
    } catch (lockErr) {
      this.authLogger.warn({ lockErr }, 'Could not acquire Redis auth lock, fetching directly');
    }

    if (!lockAcquired) {
      // Another process is refreshing the token. Wait 500ms and check cache again.
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const redis = getRedisClient();
        const cachedToken = await redis.get(tokenCacheKey);
        if (cachedToken) {
          return cachedToken;
        }
      } catch {
        // Continue to fetch
      }
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
      this.memoryTokenExpiresAt = now + ttlSeconds * 1000;
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

    // In development or test, if mock secret is provided, avoid hitting live endpoint if mock credentials are set
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test') || isTest) {
      this.authLogger.info('Using local simulated GDS access token for development/sandbox credentials');
      return `MOCK-GDS-TOKEN-${Date.now()}|${env.GDS_CLIENT_ID}-S|202610051210|prod|FFFF`;
    }

    try {
      this.authLogger.info({ url: authUrl, clientId: env.GDS_CLIENT_ID }, 'Requesting new GDS access token');

      const response = await axios.post(
        authUrl,
        {
          ClientId: env.GDS_CLIENT_ID,
          ClientSecret: env.GDS_CLIENT_SECRET,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: env.GDS_REQUEST_TIMEOUT_MS,
        }
      );

      // GDS returns the raw string token (or string within JSON)
      const token = typeof response.data === 'string' ? response.data.trim() : response.data;

      if (!token) {
        throw new AuthenticationError('GDS returned empty access token');
      }

      this.authLogger.info('Successfully acquired fresh GDS access token');
      return token;
    } catch (error: any) {
      this.authLogger.error({ error: error.message }, 'Failed to fetch GDS access token');

      if (isDevelopment || isTest) {
        this.authLogger.warn('Falling back to local development simulated token due to upstream error');
        return `DEV-FALLBACK-TOKEN-${Date.now()}|${env.GDS_CLIENT_ID}-S|202610051210|prod|FFFF`;
      }

      throw new AuthenticationError(
        `Failed to authenticate with GDS provider: ${error.response?.data?.message || error.message}`
      );
    }
  }
}
