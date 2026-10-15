import type { ListBookingsQuery, UpdateBookingStatusBody, AdminCancelBookingBody } from './booking-management.validation';
import { Prisma } from '@prisma/client';
export declare class BookingManagementService {
    private static instance;
    private constructor();
    static getInstance(): BookingManagementService;
    /**
     * List all bookings with rich filtering.
     */
    listBookings(query: ListBookingsQuery): Promise<{
        bookings: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            bookingNumber: string;
            providerTicketNo: string | null;
            providerPnrNo: string | null;
            fromCityName: string;
            toCityName: string;
            journeyDate: string;
            operatorName: string;
            busType: string;
            totalFare: Prisma.Decimal;
            contactName: string;
            contactEmail: string;
            contactPhone: string;
            confirmedAt: Date | null;
            _count: {
                seats: number;
                passengers: number;
            };
        }[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
    /**
     * Get full booking details with all relations.
     */
    getBookingDetails(bookingId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
        } | null;
        seats: {
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            fareTotal: Prisma.Decimal;
            fareBase: Prisma.Decimal;
            fareTax: Prisma.Decimal;
            deck: number;
            row: number;
            column: number;
        }[];
        ticket: {
            id: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            updatedAt: Date;
            bookingId: string;
            storageKey: string | null;
            ticketNumber: string;
            pnrNumber: string;
            pdfUrl: string | null;
            bookingSnapshot: Prisma.JsonValue;
            generatedAt: Date;
        } | null;
        payments: {
            metadata: Prisma.JsonValue | null;
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            idempotencyKey: string | null;
            bookingId: string;
            amount: Prisma.Decimal;
            currency: string;
            gateway: string;
            paymentMethod: string | null;
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        }[];
        cancellations: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.CancellationStatus;
            createdAt: Date;
            updatedAt: Date;
            totalFare: Prisma.Decimal;
            idempotencyKey: string | null;
            bookingId: string;
            seatNos: string[];
            providerNewHoldId: string | null;
            providerNewTicketNo: string | null;
            providerNewPnrNo: string | null;
            chargePct: Prisma.Decimal;
            chargeAmt: Prisma.Decimal;
            refundAmount: Prisma.Decimal;
            reason: string | null;
        }[];
        refunds: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.RefundStatus;
            createdAt: Date;
            updatedAt: Date;
            idempotencyKey: string | null;
            bookingId: string;
            amount: Prisma.Decimal;
            reason: string;
            paymentId: string | null;
            cancellationId: string | null;
            destination: import(".prisma/client").$Enums.RefundDestination;
            gatewayRefundId: string | null;
            providerRefundRef: string | null;
            retryCount: number;
            completedAt: Date | null;
        }[];
        passengers: {
            name: string;
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            age: number;
            gender: string;
            fare: Prisma.Decimal;
            isAcSeat: boolean;
        }[];
        holds: {
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.HoldStatus;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date;
            providerName: string;
            providerHoldId: string;
            fromCityId: number;
            toCityId: number;
            journeyDate: string;
            busId: number;
            bookingId: string | null;
            seats: Prisma.JsonValue;
            releasedAt: Date | null;
        }[];
        providerTransactions: {
            requestId: string;
            id: string;
            createdAt: Date;
            providerName: string;
            bookingId: string | null;
            operation: string;
            requestPayload: Prisma.JsonValue | null;
            responsePayload: Prisma.JsonValue | null;
            responseStatus: number | null;
            durationMs: number;
            errorMessage: string | null;
        }[];
    } & {
        version: number;
        userId: string | null;
        id: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        userType: string;
        bookingNumber: string;
        providerName: string;
        providerHoldId: string | null;
        providerTicketNo: string | null;
        providerPnrNo: string | null;
        fromCityId: number;
        toCityId: number;
        fromCityName: string;
        toCityName: string;
        journeyDate: string;
        busId: number;
        tripId: string;
        pickupCode: string;
        pickupLocation: string;
        pickupTime: string;
        dropoffCode: string;
        dropoffLocation: string;
        dropoffTime: string;
        operatorName: string;
        busType: string;
        totalFare: Prisma.Decimal;
        baseFare: Prisma.Decimal;
        serviceTax: Prisma.Decimal;
        operatorGst: Prisma.Decimal;
        convenienceFee: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        cancellationPolicy: Prisma.JsonValue | null;
        pickupSnapshot: Prisma.JsonValue | null;
        dropoffSnapshot: Prisma.JsonValue | null;
        idempotencyKey: string | null;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    /**
     * Admin status override — manually transition booking status with validation.
     */
    updateBookingStatus(bookingId: string, data: UpdateBookingStatusBody, adminId: string): Promise<{
        seats: {
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            fareTotal: Prisma.Decimal;
            fareBase: Prisma.Decimal;
            fareTax: Prisma.Decimal;
            deck: number;
            row: number;
            column: number;
        }[];
        passengers: {
            name: string;
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            age: number;
            gender: string;
            fare: Prisma.Decimal;
            isAcSeat: boolean;
        }[];
    } & {
        version: number;
        userId: string | null;
        id: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        userType: string;
        bookingNumber: string;
        providerName: string;
        providerHoldId: string | null;
        providerTicketNo: string | null;
        providerPnrNo: string | null;
        fromCityId: number;
        toCityId: number;
        fromCityName: string;
        toCityName: string;
        journeyDate: string;
        busId: number;
        tripId: string;
        pickupCode: string;
        pickupLocation: string;
        pickupTime: string;
        dropoffCode: string;
        dropoffLocation: string;
        dropoffTime: string;
        operatorName: string;
        busType: string;
        totalFare: Prisma.Decimal;
        baseFare: Prisma.Decimal;
        serviceTax: Prisma.Decimal;
        operatorGst: Prisma.Decimal;
        convenienceFee: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        cancellationPolicy: Prisma.JsonValue | null;
        pickupSnapshot: Prisma.JsonValue | null;
        dropoffSnapshot: Prisma.JsonValue | null;
        idempotencyKey: string | null;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    /**
     * Admin-initiated cancellation with optional refund.
     */
    adminCancelBooking(bookingId: string, data: AdminCancelBookingBody, adminId: string): Promise<{
        seats: {
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            fareTotal: Prisma.Decimal;
            fareBase: Prisma.Decimal;
            fareTax: Prisma.Decimal;
            deck: number;
            row: number;
            column: number;
        }[];
        passengers: {
            name: string;
            id: string;
            bookingId: string;
            seatNo: string;
            seatTypeId: number;
            age: number;
            gender: string;
            fare: Prisma.Decimal;
            isAcSeat: boolean;
        }[];
    } & {
        version: number;
        userId: string | null;
        id: string;
        status: import(".prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        agentId: string | null;
        userType: string;
        bookingNumber: string;
        providerName: string;
        providerHoldId: string | null;
        providerTicketNo: string | null;
        providerPnrNo: string | null;
        fromCityId: number;
        toCityId: number;
        fromCityName: string;
        toCityName: string;
        journeyDate: string;
        busId: number;
        tripId: string;
        pickupCode: string;
        pickupLocation: string;
        pickupTime: string;
        dropoffCode: string;
        dropoffLocation: string;
        dropoffTime: string;
        operatorName: string;
        busType: string;
        totalFare: Prisma.Decimal;
        baseFare: Prisma.Decimal;
        serviceTax: Prisma.Decimal;
        operatorGst: Prisma.Decimal;
        convenienceFee: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        cancellationPolicy: Prisma.JsonValue | null;
        pickupSnapshot: Prisma.JsonValue | null;
        dropoffSnapshot: Prisma.JsonValue | null;
        idempotencyKey: string | null;
        confirmedAt: Date | null;
        cancelledAt: Date | null;
    }>;
    /**
     * Trigger manual reconciliation for stuck/unknown bookings.
     */
    reconcileBooking(bookingId: string, adminId: string): Promise<{
        message: string;
        bookingId: string;
        currentStatus: import(".prisma/client").$Enums.BookingStatus;
    }>;
    /**
     * Get booking statistics.
     */
    getBookingStats(): Promise<{
        statusDistribution: {
            status: import(".prisma/client").$Enums.BookingStatus;
            count: number;
        }[];
        todayBookings: number;
        totalConfirmedRevenue: number | Prisma.Decimal;
    }>;
}
//# sourceMappingURL=booking-management.service.d.ts.map