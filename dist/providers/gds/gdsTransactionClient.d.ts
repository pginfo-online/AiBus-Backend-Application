import { CircuitBreaker } from '../circuitBreaker';
import { GdsHoldRequest, GdsHoldResponse, GdsBookResponse, GdsBookingStatusResponse, GdsIsCancellableResponse, GdsCancelRequest, GdsCancelResponse, GdsBookingDetailsResponse, GdsBalanceResponse } from '../types';
export declare class GdsTransactionClient {
    private readonly client;
    private readonly authClient;
    private readonly circuitBreaker;
    private readonly txLogger;
    constructor(circuitBreaker: CircuitBreaker);
    holdSeats(request: GdsHoldRequest): Promise<GdsHoldResponse>;
    bookSeats(holdId: string | number, totalFare?: number): Promise<GdsBookResponse>;
    checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse>;
    isCancellable(ticketNo: string, seatNos: string): Promise<GdsIsCancellableResponse>;
    cancelSeats(request: GdsCancelRequest): Promise<GdsCancelResponse>;
    getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse>;
    getBalance(): Promise<GdsBalanceResponse>;
}
//# sourceMappingURL=gdsTransactionClient.d.ts.map