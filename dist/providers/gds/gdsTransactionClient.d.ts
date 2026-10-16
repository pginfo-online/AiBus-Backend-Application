import { CircuitBreaker } from '../circuitBreaker';
import { GdsHoldRequest, GdsHoldResponse, GdsBookResponse, GdsBookingStatusResponse, GdsIsCancellableResponse, GdsCancelRequest, GdsCancelResponse, GdsBookingDetailsResponse, GdsBalanceResponse } from '../types';
export declare function buildGdsHoldSeatsPayload(request: GdsHoldRequest): {
    Passengers: {
        Name: string;
        Age: number;
        Gender: "M" | "F";
        SeatNo: string;
        Fare: number;
        SeatTypeId: number;
        IsAcSeat: boolean;
    }[];
    GSTDetails?: {
        Gstin: string;
        GstCompany: string;
    } | undefined;
    FromCityId: number;
    ToCityId: number;
    JourneyDate: string;
    BusId: number;
    PickUpID: string;
    DropOffID: string;
    ContactInfo: {
        CustomerName: string;
        Email: string;
        Phone: string;
        Mobile: string;
    };
};
export declare class GdsTransactionClient {
    private readonly client;
    private readonly authClient;
    private readonly circuitBreaker;
    private readonly txLogger;
    constructor(circuitBreaker: CircuitBreaker);
    holdSeats(request: GdsHoldRequest): Promise<GdsHoldResponse>;
    bookSeats(holdId: string | number, totalFare?: number): Promise<GdsBookResponse>;
    checkBookingStatus(holdId: string | number): Promise<GdsBookingStatusResponse>;
    isCancellable(ticketNo: string, seatNos: string, pnrNo?: string): Promise<GdsIsCancellableResponse>;
    cancelSeats(request: GdsCancelRequest): Promise<GdsCancelResponse>;
    getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse>;
    getBalance(): Promise<GdsBalanceResponse>;
}
//# sourceMappingURL=gdsTransactionClient.d.ts.map