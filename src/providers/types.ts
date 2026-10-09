// ---------------------------------------------------------------------------
// GDS Provider Types and Interfaces (Derived from GDS API Documentation)
// ---------------------------------------------------------------------------

export interface GdsCity {
  CityId: number;
  CityName: string;
  State?: string;
}

export interface GdsSearchParams {
  fromCityId: number;
  toCityId: number;
  journeyDate: string; // YYYY-MM-DD
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
  Address?: string;
  Landmark?: string;
  Contact?: string;
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
  CancellationPolicy?: Array<{ Amt: number; Pct: number; Mins: number }>;
}

export interface GdsSeatLayoutItem {
  seq_no: number;
  seat_no: string;
  seat_type: number; // 1: Seating, 2: Sleeper, 4: Semi Sleeper
  deck: number; // 1: Lower, 2: Upper
  row: number;
  column: number;
  length: number;
  width: number;
  seat_status: number; // 0: Not available, 1: Available, 2: Male, 3: Female, -2: Booked by M, -3: Booked by F
  base_fare: number;
  total_fare: number;
  service_tax: number;
}

export interface GdsChartResponse {
  BusId: number;
  TotalSeats: number;
  AvailableSeats: number;
  Layout: GdsSeatLayoutItem[];
  BoardingPoints: GdsBoardingPoint[];
  DroppingPoints: GdsDroppingPoint[];
  CancellationPolicy: Array<{ Amt: number; Pct: number; Mins: number }>;
  ChartLayout?: any;
  ChartSeats?: any;
  SeatsStatus?: any;
  BusTypeName?: string;
  CompanyName?: string;
  DepartureTime?: string;
  ArrivalTime?: string;
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
  Passengers?: GdsPassengerHold[];
}

export interface GdsHoldResponse {
  HoldId: string | number;
  Status: number; // 1 = success
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
  Status: number; // 1 = success, 0 = in progress, -1 = unsuccessful, -2 = not found
  TicketNo?: string;
  PNRNo?: string;
  Message?: string;
}

export interface GdsIsCancellableResponse {
  IsCancellable: boolean;
  ChargePct?: number;
  ChargeAmt?: number;
  TotalFare?: number;
  CancSeatsTotalFare?: number;
  RefundPercentage?: number;
  CancellationCharge?: number;
  RefundAmount: number;
  Message?: string;
}

export interface GdsCancelRequest {
  TicketNo: string;
  SeatNos: string; // Comma-separated "A1,A2" or "7"
  PNR?: string;
  PNRNo?: string;
}

export interface GdsCancelResponse {
  Status: number;
  NewHoldId?: string | number;
  NewTicketNo?: string;
  NewPNRNo?: string;
  NewTotalFare?: number;
  ChargeAmt?: number;
  ChargePct?: number;
  RefundAmount: number;
  CancellationCharge: number;
  TotalFare?: number;
  Message?: string;
}

export interface GdsPickupInfo {
  PickupTime?: string;
  Address?: string;
  Phone?: string;
  Landmark?: string;
  PickupName?: string;
}

export interface GdsPassengerDetail {
  IsAcSeat?: boolean;
  Age?: number;
  Fare?: number;
  SeatType?: string;
  SeatNo?: string;
  Gender?: string;
  Name?: string;
}

export interface GdsContactInfo {
  Mobile?: string;
  Phone?: string;
  Email?: string;
  CustomerName?: string;
}

export interface GdsBookingDetailsResponse {
  IsCancelled?: boolean;
  TotalFare?: number;
  TotalSeats?: number;
  PickupInfo?: GdsPickupInfo;
  Passengers?: GdsPassengerDetail[];
  ContactInfo?: GdsContactInfo;
  BusTypeName?: string;
  DepartureDateTime?: string;
  ArrivalDateTime?: string;
  JourneyDate?: string;
  ToCityName?: string;
  FromCityName?: string;
  CompanyName?: string;
  TicketNo?: string;
  PNRNo?: string;
  Status?: string | number;
  BusId?: number;
  Seats?: any[];
  [key: string]: any;
}

export interface GdsBalanceResponse {
  Balance: number;
  Currency: string;
}

/** Standard GDS Adapter interface */
export interface IGdsAdapter {
  getCities(): Promise<GdsCity[]>;
  searchBuses(params: GdsSearchParams): Promise<GdsBusSearchResult[]>;
  searchBus(params: {
    busId: number;
    fromCityId: number;
    toCityId: number;
    journeyDate: string;
  }): Promise<GdsBusSearchResult[]>;
  getSeatChart(busId: number): Promise<GdsChartResponse>;
  holdSeats(params: GdsHoldRequest): Promise<GdsHoldResponse>;
  bookSeats(holdId: string): Promise<GdsBookResponse>;
  checkBookingStatus(holdId: string): Promise<GdsBookingStatusResponse>;
  isCancellable(ticketNo: string, seatNos: string): Promise<GdsIsCancellableResponse>;
  cancelSeats(params: GdsCancelRequest): Promise<GdsCancelResponse>;
  getBookingDetails(pnr: string, ticketNo: string): Promise<GdsBookingDetailsResponse>;
  getBalance(): Promise<GdsBalanceResponse>;
}
