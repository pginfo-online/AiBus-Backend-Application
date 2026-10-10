import axios, { AxiosInstance } from 'axios';
import { env, isDevelopment, isTest } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { GdsAuthClient } from './gdsAuthClient';
import { CircuitBreaker } from '../circuitBreaker';
import {
  GdsCity,
  GdsSearchParams,
  GdsBusSearchResult,
  GdsChartResponse,
} from '../types';
import { parseGdsSearchResponse } from './gdsSearchResponse';
import { parseGdsChartResponse } from './gdsChartResponse';
import { MOCK_CITIES, getMockBuses, getMockChart } from './gdsMockData';

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

  /**
   * Mantis GET /ota/CityList
   */
  public async getCityList(): Promise<GdsCity[]> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<any>('/ota/CityList');
        const raw = response.data;
        let list: any[] = [];
        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw && Array.isArray(raw.data)) {
          list = raw.data;
        } else if (raw && Array.isArray(raw.CityList)) {
          list = raw.CityList;
        } else if (raw && Array.isArray(raw.cities)) {
          list = raw.cities;
        } else if (raw && typeof raw === 'object') {
          const found = Object.values(raw).find((v) => Array.isArray(v));
          if (Array.isArray(found)) {
            list = found;
          }
        }

        const parsedCities: GdsCity[] = list
          .map((item: any) => ({
            CityId: Number(item.CityId || item.id || item.cityId || 0),
            CityName: String(item.City || item.CityName || item.name || '').trim(),
            State: String(item.State || item.state || '').trim(),
          }))
          .filter((c) => c.CityId > 0 && c.CityName.length > 0);

        if (parsedCities.length > 0) {
          return parsedCities;
        }

        throw new Error('CityList returned 0 cities from GDS');
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message }, 'GDS CityList call failed');
        if (isDevelopment || isTest) {
          this.partnerLogger.warn('Falling back to simulated city list');
          return MOCK_CITIES;
        }
        throw err;
      }
    });
  }

  /**
   * Mantis GET /ota/Search
   */
  public async searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<unknown>('/ota/Search', {
          params: {
            fromCityId: Number(params.fromCityId),
            toCityId: Number(params.toCityId),
            journeyDate: params.journeyDate,
          },
        });
        return parseGdsSearchResponse(response.data);
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message, params }, 'GDS Search call failed');
        if (isDevelopment || isTest) {
          this.partnerLogger.warn('Falling back to simulated bus search results');
          return getMockBuses(Number(params.fromCityId), Number(params.toCityId), params.journeyDate);
        }
        throw err;
      }
    });
  }

  /**
   * Mantis GET /ota/Chart
   */
  public async getSeatChart(
    busId: number,
    extraParams?: { fromCityId?: number; toCityId?: number; journeyDate?: string }
  ): Promise<GdsChartResponse> {
    const params = {
      busId: Number(busId),
      ...(extraParams?.fromCityId ? { fromCityId: Number(extraParams.fromCityId) } : {}),
      ...(extraParams?.toCityId ? { toCityId: Number(extraParams.toCityId) } : {}),
      ...(extraParams?.journeyDate ? { journeyDate: extraParams.journeyDate } : {}),
    };

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<unknown>('/ota/Chart', {
          params,
        });
        return parseGdsChartResponse(response.data, busId);
      } catch (err: any) {
        const providerResponse = err.response?.data;
        const providerError =
          providerResponse && typeof providerResponse === 'object' && 'Error' in providerResponse
            ? providerResponse.Error
            : undefined;
        const errorDetails =
          providerError && typeof providerError === 'object'
            ? {
                code: 'Code' in providerError ? providerError.Code : undefined,
                message: 'Msg' in providerError ? providerError.Msg : undefined,
                traceId: 'TraceId' in providerError ? providerError.TraceId : undefined,
              }
            : undefined;

        this.partnerLogger.error(
          {
            err: err.message,
            status: err.response?.status,
            params,
            ...(errorDetails ? { providerError: errorDetails } : {}),
          },
          'GDS Chart call failed'
        );
        if (isDevelopment || isTest) {
          this.partnerLogger.warn({ busId }, 'Falling back to simulated seat chart layout');
          return getMockChart(busId);
        }
        throw err;
      }
    });
  }

  /**
   * Mantis GET /ota/SearchBus
   */
  public async searchBus(params: {
    busId: number;
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
  }): Promise<GdsBusSearchResult[]> {
    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<unknown>('/ota/SearchBus', {
          params: {
            busId: Number(params.busId),
            fromCityId: Number(params.fromCityId),
            toCityId: Number(params.toCityId),
            journeyDate: params.journeyDate,
          },
        });
        return parseGdsSearchResponse(response.data);
      } catch (err: any) {
        this.partnerLogger.error({ err: err.message, params }, 'GDS SearchBus call failed');
        if (isDevelopment || isTest) {
          return getMockBuses(params.fromCityId, params.toCityId, params.journeyDate).filter(
            (b) => b.RouteBusId === params.busId
          );
        }
        throw err;
      }
    });
  }
}
