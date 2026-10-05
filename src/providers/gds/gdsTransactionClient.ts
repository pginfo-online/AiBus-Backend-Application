import axios, { AxiosInstance } from 'axios';
import { env, isDevelopment } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { GdsAuthClient } from './gdsAuthClient';
import { CircuitBreaker } from '../circuitBreaker';
import {
  GdsHoldRequest,
  GdsHoldResponse,
  GdsBookResponse,
  GdsBookingStatusResponse,
  GdsIsCancellableResponse,
  GdsCancelRequest,
  GdsCancelResponse,
  GdsBookingDetailsResponse,
  GdsBalanceResponse,
} from '../types';
import {
  getMockHoldResponse,
  getMockBookResponse,
  getMockBookingStatus,
  getMockIsCancellable,
  getMockCancelResponse,
  getMockBookingDetails,
  getMockBalance,
} from './gdsMockData';

export class GdsTransactionClient {
  private readonly client: AxiosInstance;
  private readonly authClient: GdsAuthClient;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly txLogger = logger.child({ module: 'gds-transaction' });

  constructor(circuitBreaker: CircuitBreaker) {
    this.authClient = GdsAuthClient.getInstance();
    this.circuitBreaker = circuitBreaker;

    this.client = axios.create({
      baseURL: env.GDS_TRANSACTION_BASE_URL,
      timeout: env.GDS_REQUEST_TIMEOUT_MS,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await this.authClient.getAccessToken();
      config.headers['access-token'] = token;
      return config;
    });
  }

  public async holdSeats(request: GdsHoldRequest): Promise<GdsHoldResponse> {
    const totalFare = request.Passenger.reduce((sum, p) => sum + p.Fare, 0);

    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockHoldResponse(totalFare);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<GdsHoldResponse>('/ota/HoldSeats', request);
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, request }, 'GDS HoldSeats failed');
        if (isDevelopment) {
          this.txLogger.warn('Falling back to mock hold in development');
          return getMockHoldResponse(totalFare);
        }
        throw err;
      }
    });
  }

  public async bookSeats(holdId: string, totalFare = 1050): Promise<GdsBookResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockBookResponse(holdId, totalFare);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<GdsBookResponse>('/ota/BookSeats', {
          HoldId: holdId,
        });
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, holdId }, 'GDS BookSeats failed');
        if (isDevelopment) {
          this.txLogger.warn('Falling back to mock book in development');
          return getMockBookResponse(holdId, totalFare);
        }
        throw err;
      }
    });
  }

  public async checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockBookingStatus(holdId);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<GdsBookingStatusResponse>('/ota/bookingstatusv2', {
          HoldId: holdId,
        });
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, holdId }, 'GDS bookingstatusv2 failed');
        if (isDevelopment) {
          return getMockBookingStatus(holdId);
        }
        throw err;
      }
    });
  }

  public async isCancellable(ticketNo: string, seatNos: string): Promise<GdsIsCancellableResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockIsCancellable(ticketNo);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsIsCancellableResponse>('/ota/IsCancellable', {
          params: { ticketNo, seatNos },
        });
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, ticketNo, seatNos }, 'GDS IsCancellable failed');
        if (isDevelopment) {
          return getMockIsCancellable(ticketNo);
        }
        throw err;
      }
    });
  }

  public async cancelSeats(request: GdsCancelRequest): Promise<GdsCancelResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockCancelResponse(787.5, 262.5);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.post<GdsCancelResponse>('/ota/CancelSeats', request);
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, request }, 'GDS CancelSeats failed');
        if (isDevelopment) {
          return getMockCancelResponse(787.5, 262.5);
        }
        throw err;
      }
    });
  }

  public async getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockBookingDetails(pnr, ticketNo);
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsBookingDetailsResponse>('/ota/BookingDetails', {
          params: { pnr, ticketNo },
        });
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, pnr, ticketNo }, 'GDS BookingDetails failed');
        if (isDevelopment) {
          return getMockBookingDetails(pnr, ticketNo);
        }
        throw err;
      }
    });
  }

  public async getBalance(): Promise<GdsBalanceResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test')) {
      return getMockBalance();
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsBalanceResponse>('/ota/balance');
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message }, 'GDS balance call failed');
        if (isDevelopment) {
          return getMockBalance();
        }
        throw err;
      }
    });
  }
}
