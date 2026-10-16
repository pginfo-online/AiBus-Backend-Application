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
    passengers: Array<{
        name: string;
        age: number;
        gender: string;
        seatNo: string;
    }>;
}
/**
 * Generates an enterprise-styled, print-ready PDF e-ticket using PDFKit.
 * Returns a Buffer containing the complete binary PDF data.
 */
export declare function generateTicketPdf(data: TicketPdfData): Promise<Buffer>;
//# sourceMappingURL=ticketPdfGenerator.d.ts.map