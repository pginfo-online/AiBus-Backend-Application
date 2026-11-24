import { installGdsResponseHandling } from './gdsResponseHandling';
import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env';
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
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
    });

    installGdsResponseHandling(this.client);
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
          this.txLogger.info({ holdId, status: data?.Status === undefined ? 1 : Number(data.Status) }, 'Mantis GDS HoldSeats succeeded');
          return {
            HoldId: holdId,
            Status: data?.Status === undefined ? 1 : Number(data.Status),
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

        const providerError = err.response?.data?.Error;
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
                traceId: providerError.TraceId,
              },
            }),
          },
          'GDS HoldSeats failed'
        );
        throw err;
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

        if (data?.TicketNo && data?.PNRNo && (data.Status === undefined || Number(data.Status) === 1)) {
          return {
            HoldId: String(data.HoldId || holdId),
            TicketNo: String(data.TicketNo || data.ticketNo || ''),
            PNRNo: String(data.PNRNo || data.pnrNo || ''),
            Status: data.Status === undefined ? (data.TicketNo ? 1 : 0) : Number(data.Status),
            Message: data.Message || 'Booking confirmed successfully',
            TotalFare: Number(data.TotalFare || totalFare || 0),
          };
        }

        const msg = data?.Message || data?.Error?.Msg || 'Failed to book seats with provider';
        throw new ProviderError('GDS', msg);
      } catch (err: any) {

        this.txLogger.error({ err: err.message, status: err.response?.status, holdId }, 'GDS BookSeats failed');
        throw err;
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

        this.txLogger.info({ status: data?.Status }, 'Mantis GDS bookingstatusv2 response');

        const status = data?.Status === undefined || data?.Status === null || data?.Status === '' ? NaN : Number(data.Status);
        if (![1, 0, -1, -2].includes(status) || (status === 1 && (!data.TicketNo || !data.PNRNo))) {
          throw new ProviderError('GDS', 'Invalid booking status response');
        }

        return {
          HoldId: String(data?.HoldId || holdId),
          Status: status,
          TicketNo: data?.TicketNo ? String(data.TicketNo) : undefined,
          PNRNo: data?.PNRNo ? String(data.PNRNo) : undefined,
          Message: data?.Message || (status === 1 ? 'BOOKING SUCCESSFUL' : 'Booking status retrieved'),
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, holdId }, 'GDS bookingstatusv2 failed');

        throw err;
      }
    });
  }

  public async isCancellable(ticketNo: string, seatNos: string, pnrNo?: string): Promise<GdsIsCancellableResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const cleanTicketNo = String(ticketNo || "").trim();
        const cleanSeatNos = String(seatNos || "").trim();
        const cleanPnrNo = String(pnrNo || "").trim();

        const params: Record<string, string> = {
          TicketNo: cleanTicketNo,
          ticketNo: cleanTicketNo,
          seatNos: cleanSeatNos,
          SeatNos: cleanSeatNos,
        };
        if (cleanPnrNo) {
          params.PNRNo = cleanPnrNo;
          params.PNR = cleanPnrNo;
          params.pnrNo = cleanPnrNo;
        }

        this.txLogger.info({ params }, 'Calling Mantis GDS GET /ota/IsCancellable');
        const response = await this.client.get<any>('/ota/IsCancellable', {
          params,
        });

        const raw = response.data;
        const data = raw?.data || raw;

        const isCancellableBool =
          data?.IsCancellable === true ||
          data?.IsCancellable === 'true' ||
          data?.IsCancellable === 1 ||
          data?.isCancellable === true ||
          data?.isCancellable === 'true' ||
          data?.isCancellable === 1;

        const refundAmt = Number(data?.RefundAmount ?? data?.refundAmount ?? 0);
        const chargeAmt = Number(data?.ChargeAmt ?? data?.chargeAmt ?? data?.CancellationCharge ?? data?.cancellationCharge ?? 0);
        const chargePct = Number(data?.ChargePct ?? data?.chargePct ?? data?.RefundPercentage ?? data?.refundPercentage ?? 0);
        const totalFare = Number(data?.TotalFare ?? data?.totalFare ?? data?.CancSeatsTotalFare ?? 0);

        return {
          IsCancellable: isCancellableBool,
          ChargePct: Number.isFinite(chargePct) ? chargePct : 0,
          ChargeAmt: Number.isFinite(chargeAmt) ? chargeAmt : 0,
          TotalFare: Number.isFinite(totalFare) ? totalFare : 0,
          CancSeatsTotalFare: Number(data?.CancSeatsTotalFare ?? data?.cancSeatsTotalFare ?? totalFare),
          RefundAmount: Number.isFinite(refundAmt) ? refundAmt : 0,
          Message: data?.Message || data?.message || (isCancellableBool ? 'Cancellability checked successfully' : 'Ticket is not cancellable under operator policy'),
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, ticketNo, seatNos, pnrNo }, 'GDS IsCancellable failed');
        throw err;
      }
    });
  }

  public async cancelSeats(request: GdsCancelRequest): Promise<GdsCancelResponse> {
    return this.circuitBreaker.execute(async () => {
      try {
        const cleanTicketNo = String(request.TicketNo || "").trim();
        const cleanSeatNos = String(request.SeatNos || "").trim();
        const cleanPnr = String(request.PNR || request.PNRNo || "").trim();

        const payload: any = {
          TicketNo: cleanTicketNo,
          SeatNos: cleanSeatNos,
          seatNos: cleanSeatNos,
        };
        if (cleanPnr) {
          payload.PNR = cleanPnr;
          payload.PNRNo = cleanPnr;
        }

        this.txLogger.info({ payload }, 'Calling Mantis GDS POST /ota/CancelSeats');
        const response = await this.client.post<any>('/ota/CancelSeats', payload);
        const raw = response.data;
        const data = raw?.data || raw;

        const refundAmt = Number(data?.RefundAmount ?? data?.refundAmount ?? 0);
        const isSuccess =
          raw?.success === true ||
          data?.Status === 1 ||
          data?.status === 1 ||
          data?.Status === '1' ||
          Boolean(data?.NewTicketNo) ||
          (data?.RefundAmount !== undefined && !data?.Error && !data?.error);

        if (!isSuccess || !Number.isFinite(refundAmt) || refundAmt < 0) {
          const errMsg = data?.Message || data?.message || data?.Error?.Msg || data?.Error?.msg || 'Failed to cancel seats with provider';
          throw new ProviderError('GDS', errMsg);
        }

        const chargeAmt = Number(data?.ChargeAmt ?? data?.chargeAmt ?? data?.CancellationCharge ?? data?.cancellationCharge ?? 0);
        const chargePct = Number(data?.ChargePct ?? data?.chargePct ?? 0);
        const totalFare = Number(data?.TotalFare ?? data?.totalFare ?? 0);

        return {
          Status: data?.Status === undefined ? 1 : Number(data.Status),
          NewHoldId: data?.NewHoldId ? String(data.NewHoldId) : undefined,
          NewTicketNo: data?.NewTicketNo ? String(data.NewTicketNo) : undefined,
          NewPNRNo: data?.NewPNRNo ? String(data.NewPNRNo) : undefined,
          NewTotalFare: Number(data?.NewTotalFare ?? 0),
          ChargeAmt: Number.isFinite(chargeAmt) ? chargeAmt : 0,
          ChargePct: Number.isFinite(chargePct) ? chargePct : 0,
          RefundAmount: Number.isFinite(refundAmt) ? refundAmt : 0,
          CancellationCharge: Number.isFinite(chargeAmt) ? chargeAmt : 0,
          TotalFare: Number.isFinite(totalFare) ? totalFare : 0,
          Message: data?.Message || data?.message || 'Seats cancelled successfully',
        };
      } catch (err: any) {
        this.txLogger.error({ err: err.message, request }, 'GDS CancelSeats failed');
        throw err;
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
        return data;
      } catch (err: any) {
        this.txLogger.error({ err: err.message, pnr, ticketNo }, 'GDS BookingDetails failed');

        throw err;
      }
    });
  }

  public async getBalance(): Promise<GdsBalanceResponse> {

    return this.circuitBreaker.execute(async () => {
      try {
        const response = await this.client.get<{ data: GdsBalanceResponse }>('/ota/balance');
        const data = response.data?.data;
        if (typeof data?.Balance !== 'number' || !Number.isFinite(data.Balance)) {
          throw new ProviderError('GDS', 'Invalid balance response');
        }
        return { Balance: data.Balance, Currency: 'INR' };
      } catch (err: any) {
        this.txLogger.error({ err: err.message }, 'GDS balance call failed');
        throw err;
      }
    });
  }
}
