import { IGdsAdapter, GdsCity, GdsSearchParams, GdsBusSearchResult, GdsChartResponse, GdsHoldRequest, GdsHoldResponse, GdsBookResponse, GdsBookingStatusResponse, GdsIsCancellableResponse, GdsCancelRequest, GdsCancelResponse, GdsBookingDetailsResponse, GdsBalanceResponse } from '../types';
export declare class GdsAdapter implements IGdsAdapter {
    private static instance;
    private readonly circuitBreaker;
    private readonly partnerClient;
    private readonly transactionClient;
    private readonly adapterLogger;
    private constructor();
    static getInstance(): GdsAdapter;
    getCities(): Promise<GdsCity[]>;
    searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]>;
    searchBus(params: {
        busId: number;
        fromCityId: number;
        toCityId: number;
        journeyDate: string;
    }): Promise<GdsBusSearchResult[]>;
    getSeatChart(busId: number, extraParams?: {
        fromCityId?: number;
        toCityId?: number;
        journeyDate?: string;
    }): Promise<GdsChartResponse>;
    holdSeats(params: GdsHoldRequest): Promise<GdsHoldResponse>;
    bookSeats(holdId: string, totalFare?: number): Promise<GdsBookResponse>;
    checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse>;
    isCancellable(ticketNo: string, seatNos: string): Promise<GdsIsCancellableResponse>;
    cancelSeats(params: GdsCancelRequest): Promise<GdsCancelResponse>;
    getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse>;
    getBalance(): Promise<GdsBalanceResponse>;
    getCircuitBreakerState(): import(".").CircuitState;
    /**
     * Asynchronously audit-logs provider transactions without blocking response pipeline
     */
    private recordTransaction;
}
//# sourceMappingURL=gdsAdapter.d.ts.map