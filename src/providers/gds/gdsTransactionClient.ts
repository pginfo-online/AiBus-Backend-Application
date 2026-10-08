import axios, { AxiosInstance } from 'axios';
import { env, isDevelopment } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { GdsAuthClient } from './gdsAuthClient';
import { CircuitBreaker } from '../circuitBreaker';
import { ProviderError } from '../../shared/errors';
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
    return this.circuitBreaker.execute(async () => {
      try {
        const passengers = (request.Passengers || request.Passenger || []).map((p) => ({
          Name: p.Name,
          Age: Number(p.Age),
          Gender: p.Gender,
          SeatNo: String(p.SeatNo),
          Fare: Number(p.Fare),
          SeatTypeId: Number(p.SeatTypeId || 1),
          IsAcSeat: Boolean(p.IsAcSeat),
        }));

        const payload = {
          FromCityId: Number(request.FromCityId),
          ToCityId: Number(request.ToCityId),
          JourneyDate: request.JourneyDate,
          BusId: Number(request.BusId),
          PickUpID: String(request.PickUpID),
          DropOffID: String(request.DropOffID),
          ContactInfo: {
            CustomerName: request.ContactInfo.CustomerName,
            Email: request.ContactInfo.Email,
            Phone: request.ContactInfo.Phone,
            Mobile: request.ContactInfo.Mobile,
          },
          ...(request.GSTDetails && { GSTDetails: request.GSTDetails }),
          Passengers: passengers,
          Passenger: passengers,
        };

        this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/HoldSeats');
        const response = await this.client.post<any>('/ota/HoldSeats', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        this.txLogger.info({ response: data }, 'Mantis GDS HoldSeats Response');

        const holdId = data?.HoldId ?? data?.holdId;
        if (holdId) {
          return {
            HoldId: holdId,
            Status: data?.Status ?? 1,
            Message: data?.Message || 'Seats held successfully',
            TotalFare: Number(data?.TotalFare || passengers.reduce((sum, p) => sum + p.Fare, 0)),
            ExpiryMinutes: data?.ExpiryMinutes || 10,
          };
        }

        const msg = data?.Message || data?.Error?.Msg || 'Failed to hold seats with provider';
        throw new ProviderError('GDS', msg);
      } catch (err: any) {
        if (err instanceof ProviderError) throw err;
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to hold seats with provider';

        this.txLogger.error({ err: err.message, status: err.response?.status, errorData, request }, 'GDS HoldSeats failed');
        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async bookSeats(holdId: string | number, totalFare?: number): Promise<GdsBookResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const parsedHoldId = isNaN(Number(holdId)) ? holdId : Number(holdId);
        const payload = {
          HoldId: parsedHoldId,
        };

        this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/BookSeats');
        const response = await this.client.post<any>('/ota/BookSeats', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        this.txLogger.info({ response: data }, 'Mantis GDS BookSeats Response');

        if (data && (data.TicketNo || data.PNRNo || data.HoldId)) {
          return {
            HoldId: String(data.HoldId || holdId),
            TicketNo: String(data.TicketNo || data.ticketNo || ''),
            PNRNo: String(data.PNRNo || data.pnrNo || ''),
            Status: data.Status ?? (data.TicketNo ? 1 : 0),
            Message: data.Message || 'Booking confirmed successfully',
            TotalFare: Number(data.TotalFare || totalFare || 0),
          };
        }

        const msg = data?.Message || data?.Error?.Msg || 'Failed to book seats with provider';
        throw new ProviderError('GDS', msg);
      } catch (err: any) {
        if (err instanceof ProviderError) throw err;
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to book seats with provider';

        this.txLogger.error({ err: err.message, status: err.response?.status, errorData, holdId }, 'GDS BookSeats failed');
        throw new ProviderError('GDS', gdsMsg);
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
