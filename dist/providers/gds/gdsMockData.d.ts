import { GdsCity, GdsBusSearchResult, GdsChartResponse, GdsHoldResponse, GdsBookResponse, GdsBookingStatusResponse, GdsIsCancellableResponse, GdsCancelResponse, GdsBookingDetailsResponse, GdsBalanceResponse } from '../types';
export declare const MOCK_CITIES: GdsCity[];
export declare function getMockBuses(fromCityId: number, toCityId: number, journeyDate: string): GdsBusSearchResult[];
export declare function getMockChart(busId: number): GdsChartResponse;
export declare function getMockHoldResponse(totalFare: number): GdsHoldResponse;
export declare function getMockBookResponse(holdId: string, totalFare: number): GdsBookResponse;
export declare function getMockBookingStatus(holdId: string): GdsBookingStatusResponse;
export declare function getMockIsCancellable(ticketNo: string): GdsIsCancellableResponse;
export declare function getMockCancelResponse(refundAmount: number, chargeAmount: number): GdsCancelResponse;
export declare function getMockBookingDetails(pnr: string, ticketNo: string): GdsBookingDetailsResponse;
export declare function getMockBalance(): GdsBalanceResponse;
//# sourceMappingURL=gdsMockData.d.ts.map