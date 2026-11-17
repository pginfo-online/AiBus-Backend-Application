export interface TicketPdfData {
    bookingNumber: string;
    ticketNumber: string;
    pnrNumber: string;
    operatorName: string;
    busType: string;
    journeyDate: string;
    fromCityName: string;
    toCityName: string;
    pickupLocation: string;
    pickupTime: string;
    dropoffLocation: string;
    dropoffTime: string;
    totalFare: number | string;
    contactName: string;
    contactPhone: string;
    status?: string;
    pickupSnapshot?: unknown;
    dropoffSnapshot?: unknown;
    passengers: {
        name: string;
        age: number;
        gender: string;
        seatNo: string;
        cancelled?: boolean;
    }[];
}
export declare function generateTicketPdf(data: TicketPdfData): Promise<Buffer>;
//# sourceMappingURL=ticketPdfGenerator.d.ts.map