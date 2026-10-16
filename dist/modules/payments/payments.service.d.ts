import { CreatePaymentIntentInput, VerifyPaymentInput, SimulateWebhookInput } from './payments.validation';
export interface DevPaymentSimulationState {
    merchantTxnId: string;
    status: 'PENDING' | 'SUCCESS' | 'DECLINED' | 'TIMED_OUT';
    reason?: string;
    simulatedAt?: Date;
}
export declare const devSimulationStore: Map<string, DevPaymentSimulationState>;
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
        gateway: string;
        paymentUrl: any;
        upiIntentUrl: any;
        gatewayOrderId: string | null;
        sdkPayload: any;
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
            paymentMethod: string | null;
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
            paymentMethod: string | null;
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
    /**
     * Razorpay Webhook Ingestion & Processing
     * Verifies cryptographic HMAC SHA256 signature and processes captured/failed events
     */
    handleRazorpayWebhook(rawBody: string | any, headers: Record<string, string | string[] | undefined>): Promise<{
        status: string;
        reason: string;
    } | {
        status: string;
        reason?: undefined;
    }>;
    /**
     * Controlled Webhook Simulator for Local Development & Testing
     * Only active when NODE_ENV !== 'production'.
     * Constructs valid PhonePe signed webhook payload and exercises production webhook handler.
     */
    simulateWebhook(input: SimulateWebhookInput): Promise<{
        simulationStatus: "SUCCESS" | "TIMED_OUT" | "DECLINED";
        webhookResult: {
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
        };
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
            paymentMethod: string | null;
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        } | null;
        booking: ({
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
                bookingSnapshot: import("@prisma/client/runtime/library").JsonValue;
                generatedAt: Date;
            } | null;
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
        }) | null;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus | undefined;
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
            bookingSnapshot: import("@prisma/client/runtime/library").JsonValue;
            generatedAt: Date;
        } | null | undefined;
    }>;
    /**
     * B2B Agent Wallet Debit Payment
     * Deducts net fare (grossFare - commissionAmt) from agent wallet with optimistic concurrency,
     * posts balanced double-entry ledger entries, and confirms booking.
     */
    payWithWallet(bookingId: string, agentId: string, userId?: string): Promise<{
        success: boolean;
        booking: {
            commissionSnapshot: {
                id: string;
                createdAt: Date;
                agentId: string;
                bookingId: string;
                ruleId: string | null;
                ruleSnapshot: import("@prisma/client/runtime/library").JsonValue;
                grossFare: import("@prisma/client/runtime/library").Decimal;
                baseFareForCommission: import("@prisma/client/runtime/library").Decimal;
                commissionRate: import("@prisma/client/runtime/library").Decimal;
                commissionAmt: import("@prisma/client/runtime/library").Decimal;
                netFare: import("@prisma/client/runtime/library").Decimal;
                reversedAt: Date | null;
                reversalAmt: import("@prisma/client/runtime/library").Decimal | null;
            } | null;
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
        message: string;
        payment?: undefined;
        netFarePaid?: undefined;
        commissionEarned?: undefined;
    } | {
        success: boolean;
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
            paymentMethod: string | null;
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        };
        netFarePaid: number;
        commissionEarned: number;
        message?: undefined;
    }>;
    /**
     * Generates a mobile-responsive, secure Razorpay Checkout HTML page
     * Used by mobile apps and web checkouts to render the official Razorpay payment sheet
     */
    generateCheckoutHtml(merchantTxnId: string, customRedirectUrl?: string): Promise<string>;
    /**
     * Get current dev simulation status for a transaction (dev/test only)
     */
    getDevSimulationStatus(merchantTxnId: string): DevPaymentSimulationState;
}
//# sourceMappingURL=payments.service.d.ts.map