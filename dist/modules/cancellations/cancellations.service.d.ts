export declare class CancellationsService {
    private static instance;
    private gdsAdapter;
    private cancelLogger;
    private constructor();
    static getInstance(): CancellationsService;
    checkCancellability(bookingId: string, seatNos?: string[]): Promise<{
        IsCancellable: boolean;
        RefundPercentage: number;
        CancellationCharge: number;
        RefundAmount: number;
        Message?: string;
        bookingId: string;
        ticketNo: string;
        seatNos: string;
    }>;
    cancelSeats(bookingId: string, seatNos: string[], reason?: string, userId?: string): Promise<{
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
    }>;
}
//# sourceMappingURL=cancellations.service.d.ts.map