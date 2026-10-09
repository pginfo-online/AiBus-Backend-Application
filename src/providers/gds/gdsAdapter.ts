import { CircuitBreaker } from '../circuitBreaker';
import { GdsPartnerClient } from './gdsPartnerClient';
import { GdsTransactionClient } from './gdsTransactionClient';
import { getPrismaClient } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import {
  IGdsAdapter,
  GdsCity,
  GdsSearchParams,
  GdsBusSearchResult,
  GdsChartResponse,
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

export class GdsAdapter implements IGdsAdapter {
  private static instance: GdsAdapter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly partnerClient: GdsPartnerClient;
  private readonly transactionClient: GdsTransactionClient;
  private readonly adapterLogger = logger.child({ module: 'gds-adapter' });

  private constructor() {
    this.circuitBreaker = new CircuitBreaker('GDS', {
      failureThreshold: 5,
      failureWindowMs: 60000,
      resetTimeoutMs: 30000,
    });
    this.partnerClient = new GdsPartnerClient(this.circuitBreaker);
    this.transactionClient = new GdsTransactionClient(this.circuitBreaker);
  }

  public static getInstance(): GdsAdapter {
    if (!GdsAdapter.instance) {
      GdsAdapter.instance = new GdsAdapter();
    }
    return GdsAdapter.instance;
  }

  public async getCities(): Promise<GdsCity[]> {
    return this.partnerClient.getCityList();
  }

  public async searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]> {
    return this.partnerClient.searchBuses(params);
  }

  public async searchBus(params: {
    busId: number;
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
  }): Promise<GdsBusSearchResult[]> {
    return this.partnerClient.searchBus(params);
  }

  public async getSeatChart(
    busId: number,
    extraParams?: { fromCityId?: number; toCityId?: number; journeyDate?: string }
  ): Promise<GdsChartResponse> {
    return this.partnerClient.getSeatChart(busId, extraParams);
  }

  public async holdSeats(params: GdsHoldRequest): Promise<GdsHoldResponse> {
    const start = Date.now();
    let errorMsg: string | undefined;
    let res: GdsHoldResponse | undefined;

    try {
      res = await this.transactionClient.holdSeats(params);
      return res;
    } catch (err: any) {
      errorMsg = err.message;
      throw err;
    } finally {
      this.recordTransaction('HoldSeats', params, res, Date.now() - start, errorMsg);
    }
  }

  public async bookSeats(holdId: string, totalFare = 1050): Promise<GdsBookResponse> {
    const start = Date.now();
    let errorMsg: string | undefined;
    let res: GdsBookResponse | undefined;

    try {
      res = await this.transactionClient.bookSeats(holdId, totalFare);
      return res;
    } catch (err: any) {
      errorMsg = err.message;
      throw err;
    } finally {
      this.recordTransaction('BookSeats', { holdId }, res, Date.now() - start, errorMsg);
    }
  }

  public async checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse> {
    const start = Date.now();
    let errorMsg: string | undefined;
    let res: GdsBookingStatusResponse | undefined;

    try {
      res = await this.transactionClient.checkBookingStatus(holdId);
      return res;
    } catch (err: any) {
      errorMsg = err.message;
      throw err;
    } finally {
      this.recordTransaction('BookingStatus', { holdId }, res, Date.now() - start, errorMsg);
    }
  }

  public async isCancellable(ticketNo: string, seatNos: string, pnrNo?: string): Promise<GdsIsCancellableResponse> {
    const start = Date.now();
    let errorMsg: string | undefined;
    let res: GdsIsCancellableResponse | undefined;

    try {
      res = await this.transactionClient.isCancellable(ticketNo, seatNos, pnrNo);
      return res;
    } catch (err: any) {
      errorMsg = err.message;
      throw err;
    } finally {
      this.recordTransaction('IsCancellable', { ticketNo, seatNos, pnrNo }, res, Date.now() - start, errorMsg);
    }
  }

  public async cancelSeats(params: GdsCancelRequest): Promise<GdsCancelResponse> {
    const start = Date.now();
    let errorMsg: string | undefined;
    let res: GdsCancelResponse | undefined;

    try {
      res = await this.transactionClient.cancelSeats(params);
      return res;
    } catch (err: any) {
      errorMsg = err.message;
      throw err;
    } finally {
      this.recordTransaction('CancelSeats', params, res, Date.now() - start, errorMsg);
    }
  }

  public async getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse> {
    return this.transactionClient.getBookingDetails(pnr, ticketNo);
  }

  public async getBalance(): Promise<GdsBalanceResponse> {
    return this.transactionClient.getBalance();
  }

  public getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Asynchronously audit-logs provider transactions without blocking response pipeline
   */
  private async recordTransaction(
    operation: string,
    requestPayload: any,
    responsePayload: any,
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const prisma = getPrismaClient();
      await prisma.providerTransaction.create({
        data: {
          providerName: 'GDS',
          operation,
          requestPayload: requestPayload ?? {},
          responsePayload: responsePayload ?? {},
          responseStatus: responsePayload?.Status ?? (errorMessage ? 500 : 200),
          durationMs,
          errorMessage,
          requestId: `gds-tx-${Date.now()}`,
        },
      });
    } catch (err) {
      this.adapterLogger.warn({ err }, 'Could not record provider transaction audit row');
    }
  }
}
