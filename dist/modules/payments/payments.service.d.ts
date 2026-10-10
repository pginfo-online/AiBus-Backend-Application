import { CreatePaymentIntentInput, VerifyPaymentInput } from './payments.validation';
export declare class PaymentsService {
    private static instance;
    private bookingsService;
    private constructor();
    static getInstance(): PaymentsService;
    createPaymentIntent(input: CreatePaymentIntentInput, userId?: string): Promise<{
        paymentId: string;
        merchantTxnId: string;
        amount: number;
        currency: string;
        gateway: "PHONEPE" | "RAZORPAY" | "MOCK";
        paymentUrl: string;
        gatewayOrderId: string;
    }>;
    verifyPayment(input: VerifyPaymentInput): Promise<{
        status: string;
        payment: {
            booking: {
                version: number;
                userId: string | null;
                id: string;
                status: import(".prisma/client").$Enums.BookingStatus;
                createdAt: Date;
                updatedAt: Date;
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
                totalFare: import("@prisma/client/runtime/library").Decimal;
                baseFare: import("@prisma/client/runtime/library").Decimal;
                serviceTax: import("@prisma/client/runtime/library").Decimal;
                operatorGst: import("@prisma/client/runtime/library").Decimal;
                convenienceFee: import("@prisma/client/runtime/library").Decimal;
                discountAmount: import("@prisma/client/runtime/library").Decimal;
                contactName: string;
                contactEmail: string;
                contactPhone: string;
                cancellationPolicy: import("@prisma/client/runtime/library").JsonValue | null;
                pickupSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
                dropoffSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
                idempotencyKey: string | null;
                confirmedAt: Date | null;
                cancelledAt: Date | null;
            };
        } & {
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            idempotencyKey: string | null;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            gateway: string;
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        };
        booking: {
            version: number;
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            updatedAt: Date;
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
            totalFare: import("@prisma/client/runtime/library").Decimal;
            baseFare: import("@prisma/client/runtime/library").Decimal;
            serviceTax: import("@prisma/client/runtime/library").Decimal;
            operatorGst: import("@prisma/client/runtime/library").Decimal;
            convenienceFee: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            contactName: string;
            contactEmail: string;
            contactPhone: string;
            cancellationPolicy: import("@prisma/client/runtime/library").JsonValue | null;
            pickupSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            dropoffSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            idempotencyKey: string | null;
            confirmedAt: Date | null;
            cancelledAt: Date | null;
        };
    } | {
        status: string;
        payment: {
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            idempotencyKey: string | null;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            gateway: string;
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        };
        booking: {
            seats: {
                id: string;
                bookingId: string;
                seatNo: string;
                seatTypeId: number;
                fareTotal: import("@prisma/client/runtime/library").Decimal;
                fareBase: import("@prisma/client/runtime/library").Decimal;
                fareTax: import("@prisma/client/runtime/library").Decimal;
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
                fare: import("@prisma/client/runtime/library").Decimal;
                isAcSeat: boolean;
            }[];
        } & {
            version: number;
            userId: string | null;
            id: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            createdAt: Date;
            updatedAt: Date;
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
            totalFare: import("@prisma/client/runtime/library").Decimal;
            baseFare: import("@prisma/client/runtime/library").Decimal;
            serviceTax: import("@prisma/client/runtime/library").Decimal;
            operatorGst: import("@prisma/client/runtime/library").Decimal;
            convenienceFee: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            contactName: string;
            contactEmail: string;
            contactPhone: string;
            cancellationPolicy: import("@prisma/client/runtime/library").JsonValue | null;
            pickupSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            dropoffSnapshot: import("@prisma/client/runtime/library").JsonValue | null;
            idempotencyKey: string | null;
            confirmedAt: Date | null;
            cancelledAt: Date | null;
        };
    }>;
    /**
     * Handle PhonePe webhook event
     * POST /api/v1/payments/webhook
     * Body: { response: "<base64EncodedPayload>" }
     * Header: X-VERIFY: SHA256(base64Payload + saltKey) + "###" + saltIndex
     */
    handleWebhook(rawBody: string, xVerifyHeader?: string): Promise<{
        status: string;
        reason: string;
        note?: undefined;
    } | {
        status: string;
        note: string;
        reason?: undefined;
    } | {
        status: string;
        reason?: undefined;
        note?: undefined;
    }>;
}
//# sourceMappingURL=payments.service.d.ts.map