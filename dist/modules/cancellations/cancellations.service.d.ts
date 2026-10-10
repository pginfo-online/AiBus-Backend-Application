export declare class CancellationsService {
    private static instance;
    private gdsAdapter;
    private cancelLogger;
    private constructor();
    static getInstance(): CancellationsService;
    checkCancellability(bookingIdentifier: string, seatNos?: string[]): Promise<{
        IsCancellable: boolean;
        ChargePct?: number;
        ChargeAmt?: number;
        TotalFare?: number;
        CancSeatsTotalFare?: number;
        RefundPercentage?: number;
        CancellationCharge?: number;
        RefundAmount: number;
        Message?: string;
        bookingId: string;
        bookingNumber: string;
        ticketNo: string;
        pnrNo: string | null;
        seatNos: string;
    }>;
    checkCancellabilityDirect(params: {
        ticketNo: string;
        seatNos: string;
        pnrNo?: string;
    }): Promise<import("../../providers/types").GdsIsCancellableResponse>;
    cancelSeatsDirect(params: {
        TicketNo: string;
        SeatNos: string;
        PNR?: string;
    }): Promise<import("../../providers/types").GdsCancelResponse>;
    cancelSeats(bookingIdentifier: string, seatNos: string[], reason?: string, userId?: string): Promise<{
        cancellation: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.CancellationStatus;
            createdAt: Date;
            updatedAt: Date;
            totalFare: import("@prisma/client/runtime/library").Decimal;
            idempotencyKey: string | null;
            bookingId: string;
            seatNos: string[];
            providerNewHoldId: string | null;
            providerNewTicketNo: string | null;
            providerNewPnrNo: string | null;
            chargePct: import("@prisma/client/runtime/library").Decimal;
            chargeAmt: import("@prisma/client/runtime/library").Decimal;
            refundAmount: import("@prisma/client/runtime/library").Decimal;
            reason: string | null;
        };
        refund: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.RefundStatus;
            createdAt: Date;
            updatedAt: Date;
            idempotencyKey: string | null;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reason: string;
            paymentId: string | null;
            cancellationId: string | null;
            destination: import(".prisma/client").$Enums.RefundDestination;
            gatewayRefundId: string | null;
            providerRefundRef: string | null;
            retryCount: number;
            completedAt: Date | null;
        };
        providerResponse: import("../../providers/types").GdsCancelResponse;
    }>;
}
//# sourceMappingURL=cancellations.service.d.ts.map