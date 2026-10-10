import axios, { AxiosInstance } from 'axios';
import { env, isDevelopment, isTest } from '../../config/env';
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

export function buildGdsHoldSeatsPayload(request: GdsHoldRequest) {
  const passengers = (request.Passengers || []).map((p) => ({
    Name: p.Name,
    Age: Number(p.Age),
    Gender: p.Gender,
    SeatNo: String(p.SeatNo),
    Fare: Number(p.Fare),
    SeatTypeId: Number(p.SeatTypeId || 1),
    IsAcSeat: Boolean(p.IsAcSeat),
  }));

  return {
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
  };
}

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
        const payload = buildGdsHoldSeatsPayload(request);
        this.txLogger.info(
          {
            fromCityId: payload.FromCityId,
            toCityId: payload.ToCityId,
            journeyDate: payload.JourneyDate,
            busId: payload.BusId,
            pickupId: payload.PickUpID,
            dropoffId: payload.DropOffID,
            passengerCount: payload.Passengers.length,
          },
          'Calling Mantis GDS POST /ota/HoldSeats'
        );
        const response = await this.client.post<any>('/ota/HoldSeats', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        const holdId = data?.HoldId ?? data?.holdId;
        if (holdId) {
          this.txLogger.info({ holdId, status: data?.Status ?? 1 }, 'Mantis GDS HoldSeats succeeded');
          return {
            HoldId: holdId,
            Status: data?.Status ?? 1,
            Message: data?.Message || 'Seats held successfully',
            TotalFare: Number(
              data?.TotalFare || payload.Passengers.reduce((sum, passenger) => sum + passenger.Fare, 0)
            ),
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

        const providerError = errorData?.Error;
        this.txLogger.error(
          {
            err: err.message,
            status: err.response?.status,
            fromCityId: request.FromCityId,
            toCityId: request.ToCityId,
            journeyDate: request.JourneyDate,
            busId: request.BusId,
            pickupId: request.PickUpID,
            dropoffId: request.DropOffID,
            passengerCount: request.Passengers?.length ?? 0,
            ...(providerError && {
              providerError: {
                code: providerError.Code,
                message: providerError.Msg,
                traceId: providerError.TraceId,
              },
            }),
          },
          'GDS HoldSeats failed'
        );
        if (isDevelopment || isTest) {
          const totalFare = request.Passengers?.reduce((sum, p) => sum + (p.Fare || 1050), 0) || 1050;
          this.txLogger.warn({ totalFare }, 'Falling back to simulated HoldSeats response in dev/test');
          return getMockHoldResponse(totalFare);
        }
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
        if (isDevelopment || isTest) {
          this.txLogger.warn({ holdId }, 'Falling back to simulated BookSeats response in dev/test');
          return getMockBookResponse(String(holdId), totalFare || 1050);
        }
        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async checkBookingStatus(holdId: string | number): Promise<GdsBookingStatusResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const parsedHoldId = isNaN(Number(holdId)) ? holdId : Number(holdId);
        const payload = {
          HoldId: parsedHoldId,
        };

        this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/bookingstatusv2');
        const response = await this.client.post<any>('/ota/bookingstatusv2', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        this.txLogger.info({ response: data, holdId }, 'Mantis GDS bookingstatusv2 Response');

        const status = typeof data?.Status === 'number' ? data.Status : (data?.TicketNo ? 1 : -1);

        return {
          HoldId: String(data?.HoldId || holdId),
          Status: status,
          TicketNo: data?.TicketNo ? String(data.TicketNo) : undefined,
          PNRNo: data?.PNRNo ? String(data.PNRNo) : undefined,
          Message: data?.Message || (status === 1 ? 'BOOKING SUCCESSFUL' : 'Booking status retrieved'),
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, holdId }, 'GDS bookingstatusv2 failed');
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to check booking status with provider';

        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async isCancellable(ticketNo: string, seatNos: string, pnrNo?: string): Promise<GdsIsCancellableResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const params: Record<string, string> = {
          TicketNo: String(ticketNo),
          seatNos: String(seatNos),
        };
        if (pnrNo) {
          params.PNRNo = String(pnrNo);
        }

        this.txLogger.info({ params }, 'Calling Mantis GDS GET /ota/IsCancellable');
        const response = await this.client.get<any>('/ota/IsCancellable', {
          params,
        });

        const raw = response.data;
        const data = raw?.data || raw;

        this.txLogger.info({ response: data }, 'Mantis GDS IsCancellable Response');

        return {
          IsCancellable: Boolean(data?.IsCancellable ?? data?.isCancellable ?? true),
          ChargePct: Number(data?.ChargePct ?? data?.chargePct ?? data?.RefundPercentage ?? 0),
          ChargeAmt: Number(data?.ChargeAmt ?? data?.chargeAmt ?? data?.CancellationCharge ?? 0),
          TotalFare: Number(data?.TotalFare ?? data?.totalFare ?? data?.CancSeatsTotalFare ?? 0),
          CancSeatsTotalFare: Number(data?.CancSeatsTotalFare ?? data?.cancSeatsTotalFare ?? data?.TotalFare ?? 0),
          RefundAmount: Number(data?.RefundAmount ?? data?.refundAmount ?? 0),
          Message: data?.Message || 'Cancellability checked successfully',
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, ticketNo, seatNos, pnrNo }, 'GDS IsCancellable failed');
        if (isDevelopment || isTest) {
          this.txLogger.warn({ ticketNo }, 'Falling back to simulated IsCancellable response in dev/test');
          return getMockIsCancellable(ticketNo);
        }
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to check cancellability with provider';

        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async cancelSeats(request: GdsCancelRequest): Promise<GdsCancelResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const payload: any = {
          TicketNo: String(request.TicketNo),
          SeatNos: String(request.SeatNos),
        };
        if (request.PNR || request.PNRNo) {
          payload.PNR = String(request.PNR || request.PNRNo);
        }

        this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/CancelSeats');
        const response = await this.client.post<any>('/ota/CancelSeats', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        this.txLogger.info({ response: data }, 'Mantis GDS CancelSeats Response');

        return {
          Status: data?.Status ?? 1,
          NewHoldId: data?.NewHoldId ? String(data.NewHoldId) : undefined,
          NewTicketNo: data?.NewTicketNo ? String(data.NewTicketNo) : undefined,
          NewPNRNo: data?.NewPNRNo ? String(data.NewPNRNo) : undefined,
          NewTotalFare: Number(data?.NewTotalFare ?? 0),
          ChargeAmt: Number(data?.ChargeAmt ?? data?.CancellationCharge ?? 0),
          ChargePct: Number(data?.ChargePct ?? 0),
          RefundAmount: Number(data?.RefundAmount ?? data?.refundAmount ?? 0),
          CancellationCharge: Number(data?.CancellationCharge ?? data?.ChargeAmt ?? 0),
          TotalFare: Number(data?.TotalFare ?? 0),
          Message: data?.Message || 'Seats cancelled successfully',
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, request }, 'GDS CancelSeats failed');
        if (isDevelopment || isTest) {
          this.txLogger.warn('Falling back to simulated CancelSeats response in dev/test');
          return getMockCancelResponse(850, 200);
        }
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to cancel seats with provider';

        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        this.txLogger.info({ pnr, ticketNo }, 'Calling Mantis GDS GET /ota/BookingDetails');
        const response = await this.client.get<any>('/ota/BookingDetails', {
          params: { PNR: String(pnr), TicketNo: String(ticketNo) },
        });
        const raw = response.data;
        const data = raw?.data || raw;
        this.txLogger.info({ response: data }, 'Mantis GDS BookingDetails Response');
        return data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, pnr, ticketNo }, 'GDS BookingDetails failed');
        if (isDevelopment || isTest) {
          return getMockBookingDetails(pnr, ticketNo);
        }
        const errorData = err.response?.data;
        const gdsMsg =
          errorData?.Error?.Msg ||
          errorData?.Message ||
          errorData?.message ||
          errorData?.data?.Message ||
          (typeof errorData === 'string' ? errorData : null) ||
          err.message ||
          'Failed to get booking details from provider';

        throw new ProviderError('GDS', gdsMsg);
      }
    });
  }

  public async getBalance(): Promise<GdsBalanceResponse> {
    if (env.GDS_CLIENT_SECRET.includes('sandbox') || env.GDS_CLIENT_SECRET.includes('test') || isTest) {
      return getMockBalance();
    }

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<GdsBalanceResponse>('/ota/balance');
        return response.data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message }, 'GDS balance call failed');
        if (isDevelopment || isTest) {
          return getMockBalance();
        }
        throw err;
      }
    });
  }
}
