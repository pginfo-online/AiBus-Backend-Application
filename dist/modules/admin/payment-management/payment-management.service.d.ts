import type { ListPaymentsQuery } from './payment-management.validation';
import { Prisma } from '@prisma/client';
export declare class PaymentManagementService {
    private static instance;
    private constructor();
    static getInstance(): PaymentManagementService;
    /**
     * List all payments with filtering.
     */
    listPayments(query: ListPaymentsQuery): Promise<{
        payments: ({
            booking: {
                id: string;
                status: import(".prisma/client").$Enums.BookingStatus;
                bookingNumber: string;
                contactName: string;
                contactEmail: string;
            };
        } & {
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
        })[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
    /**
     * Get payment details.
     */
    getPaymentDetails(paymentId: string): Promise<{
        booking: {
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
        };
    } & {
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
    }>;
    /**
     * Manual payment reconciliation — queues a reconciliation job.
     */
    reconcilePayment(paymentId: string, adminId: string): Promise<{
        message: string;
        paymentId: string;
        currentStatus: import(".prisma/client").$Enums.PaymentStatus;
    }>;
    /**
     * Payment statistics.
     */
    getPaymentStats(): Promise<{
        statusDistribution: {
            status: import(".prisma/client").$Enums.PaymentStatus;
            count: number;
            totalAmount: number | Prisma.Decimal;
        }[];
        totalSuccessful: {
            count: number;
            amount: number | Prisma.Decimal;
        };
        todaySuccessful: {
            count: number;
            amount: number | Prisma.Decimal;
        };
    }>;
}
//# sourceMappingURL=payment-management.service.d.ts.map