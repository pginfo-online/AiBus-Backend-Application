export interface GdsCity {
    CityId: number;
    CityName: string;
}
export interface GdsSearchParams {
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
}
export interface GdsBoardingPoint {
    PickupCode: string;
    PickupName: string;
    Address: string;
    Landmark?: string;
    Contact?: string;
    PickupTime: string;
}
export interface GdsDroppingPoint {
    DropoffCode: string;
    DropoffName: string;
    DropoffTime: string;
}
export interface GdsBusSearchResult {
    RouteBusId: number;
    CompanyId: number;
    CompanyName: string;
    BusTypeName: string;
    DepartureTime: string;
    ArrivalTime: string;
    TripId: string;
    ChartCode: string;
    TotalSeats: number;
    AvailableSeats: number;
    BaseFare: number;
    TotalFare: number;
    ServiceTax: number;
    IsAC: boolean;
    IsSleeper: boolean;
    BoardingPoints: GdsBoardingPoint[];
    DroppingPoints: GdsDroppingPoint[];
    CancellationPolicy?: Array<{
        Amt: number;
        Pct: number;
        Mins: number;
    }>;
}
export interface GdsSeatLayoutItem {
    seq_no: number;
    seat_no: string;
    seat_type: number;
    deck: number;
    row: number;
    column: number;
    length: number;
    width: number;
    seat_status: number;
    base_fare: number;
    total_fare: number;
    service_tax: number;
}
export interface GdsChartResponse {
    BusId: number;
    BusTypeName: string;
    CompanyName: string;
    DepartureTime: string;
    ArrivalTime: string;
    TotalSeats: number;
    AvailableSeats: number;
    Layout: GdsSeatLayoutItem[];
    BoardingPoints: GdsBoardingPoint[];
    DroppingPoints: GdsDroppingPoint[];
    CancellationPolicy: Array<{
        Amt: number;
        Pct: number;
        Mins: number;
    }>;
}
export interface GdsPassengerHold {
    SeatNo: string;
    SeatTypeId: number;
    Fare: number;
    Gender: 'M' | 'F';
    Age: number;
    Name: string;
    IsAcSeat: boolean;
}
export interface GdsHoldRequest {
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
    GSTDetails?: {
        Gstin: string;
        GstCompany: string;
    };
    Passenger: GdsPassengerHold[];
}
export interface GdsHoldResponse {
    HoldId: string;
    Status: number;
    Message?: string;
    TotalFare: number;
    ExpiryMinutes?: number;
}
export interface GdsBookRequest {
    HoldId: string;
}
export interface GdsBookResponse {
    HoldId: string;
    TicketNo: string;
    PNRNo: string;
    Status: number;
    Message?: string;
    TotalFare: number;
}
export interface GdsBookingStatusResponse {
    HoldId: string;
    Status: number;
    TicketNo?: string;
    PNRNo?: string;
    Message?: string;
}
export interface GdsIsCancellableResponse {
    IsCancellable: boolean;
    RefundPercentage: number;
    CancellationCharge: number;
    RefundAmount: number;
    Message?: string;
}
export interface GdsCancelRequest {
    TicketNo: string;
    SeatNos: string;
}
export interface GdsCancelResponse {
    Status: number;
    NewHoldId?: string;
    NewTicketNo?: string;
    NewPNRNo?: string;
    RefundAmount: number;
    CancellationCharge: number;
    Message?: string;
}
export interface GdsBookingDetailsResponse {
    PNRNo: string;
    TicketNo: string;
    Status: string;
    BusId: number;
    OperatorName: string;
    FromCity: string;
    ToCity: string;
    JourneyDate: string;
    DepartureTime: string;
    ArrivalTime: string;
    TotalFare: number;
    Seats: Array<{
        SeatNo: string;
        PassengerName: string;
        Gender: string;
        Age: number;
        Fare: number;
    }>;
}
export interface GdsBalanceResponse {
    Balance: number;
    Currency: string;
}
/** Standard GDS Adapter interface */
export interface IGdsAdapter {
    getCities(): Promise<GdsCity[]>;
    searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]>;
    getSeatChart(busId: number): Promise<GdsChartResponse>;
    holdSeats(params: GdsHoldRequest): Promise<GdsHoldResponse>;
    bookSeats(holdId: string): Promise<GdsBookResponse>;
    checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse>;
    isCancellable(ticketNo: string, seatNos: string): Promise<GdsIsCancellableResponse>;
    cancelSeats(params: GdsCancelRequest): Promise<GdsCancelResponse>;
    getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse>;
    getBalance(): Promise<GdsBalanceResponse>;
}
//# sourceMappingURL=types.d.ts.map