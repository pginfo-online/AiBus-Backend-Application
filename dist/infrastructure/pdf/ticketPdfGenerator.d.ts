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
    totalFare: number | string | unknown;
    baseFare?: number | string | unknown;
    operatorGst?: number | string | unknown;
    serviceTax?: number | string | unknown;
    discountAmount?: number | string | unknown;
    walletAmount?: number | string | unknown;
    contactName: string;
    contactPhone: string;
    contactEmail?: string | null;
    status?: string | null;
    createdAt?: string | Date | null;
    confirmedAt?: string | Date | null;
    serviceId?: string | number | null;
    tripId?: string | null;
    busId?: string | number | null;
    operatorGstin?: string | null;
    operatorHelpline?: string | null;
    pickupSnapshot?: unknown;
    dropoffSnapshot?: unknown;
    cancellationPolicy?: unknown;
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