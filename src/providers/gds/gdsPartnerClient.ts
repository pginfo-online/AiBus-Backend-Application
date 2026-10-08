import axios, { AxiosInstance } from 'axios';
import { env, isDevelopment } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { GdsAuthClient } from './gdsAuthClient';
import { CircuitBreaker } from '../circuitBreaker';
import {
  GdsCity,
  GdsSearchParams,
  GdsBusSearchResult,
  GdsChartResponse,
} from '../types';
import { MOCK_CITIES, getMockBuses, getMockChart } from './gdsMockData';
import { parseGdsSearchResponse } from './gdsSearchResponse';

export class GdsPartnerClient {
  private readonly client: AxiosInstance;
  private readonly authClient: GdsAuthClient;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly partnerLogger = logger.child({ module: 'gds-partner' });

  constructor(circuitBreaker: CircuitBreaker) {
    this.authClient = GdsAuthClient.getInstance();
    this.circuitBreaker = circuitBreaker;

    this.client = axios.create({
      baseURL: env.GDS_PARTNER_BASE_URL,
      timeout: env.GDS_REQUEST_TIMEOUT_MS,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to attach access-token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.authClient.getAccessToken();
      config.headers['access-token'] = token;
      return config;
    });
  }

  public async getCityList(): Promise<GdsCity[]> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return MOCK_CITIES;
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsCity[]>('/ota/CityList');
        return response.data;
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message }, 'GDS CityList call failed');
        if (isDevelopment) {
          this.partnerLogger.warn('Falling back to mock cities data in development');
          return MOCK_CITIES;
        }
        throw err;
      }
    });
  }

  public async searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]> {
    // if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
    //   return getMockBuses(params.fromCityId, params.toCityId, params.journeyDate);
    // }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<unknown>('/ota/Search', {
          params: {
            fromCityId: params.fromCityId,
            toCityId: params.toCityId,
            journeyDate: params.journeyDate,
          },
        });
        return parseGdsSearchResponse(response.data);
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message, params }, 'GDS Search call failed');
        if (isDevelopment) {
          this.partnerLogger.warn('Falling back to mock bus search results in development');
          return getMockBuses(params.fromCityId, params.toCityId, params.journeyDate);
        }
        throw err;
      }
    });
  }

  public async getSeatChart(busId: number): Promise<GdsChartResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockChart(busId);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsChartResponse>('/ota/Chart', {
          params: { busId },
        });
        return response.data;
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message, busId }, 'GDS Chart call failed');
        if (isDevelopment) {
          this.partnerLogger.warn('Falling back to mock seat chart in development');
          return getMockChart(busId);
        }
        throw err;
      }
    });
  }
}
