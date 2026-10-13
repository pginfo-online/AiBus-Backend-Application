import type { ListUsersQuery, UpdateUserBody, SuspendUserBody } from './user-management.validation';
import { Prisma } from '@prisma/client';
export declare class UserManagementService {
    private static instance;
    private constructor();
    static getInstance(): UserManagementService;
    /**
     * List all users with pagination, filtering, search, and sorting.
     */
    listUsers(query: ListUsersQuery): Promise<{
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            _count: {
                bookings: number;
            };
        }[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
    /**
     * Get full user details including activity summary.
     */
    getUserDetails(userId: string): Promise<{
        activity: {
            totalBookings: number;
            totalSpent: number | Prisma.Decimal;
            recentBookings: {
                id: string;
                status: import(".prisma/client").$Enums.BookingStatus;
                createdAt: Date;
                bookingNumber: string;
                fromCityName: string;
                toCityName: string;
                journeyDate: string;
                totalFare: Prisma.Decimal;
            }[];
        };
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        _count: {
            bookings: number;
            payments: number;
            walletTransactions: number;
            notifications: number;
        };
    }>;
    /**
     * Admin update user profile/role/status.
     * SUPER_ADMIN-only for role changes to ADMIN/SUPER_ADMIN.
     */
    updateUser(userId: string, data: UpdateUserBody, adminRole: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Suspend a user account with reason.
     */
    suspendUser(userId: string, data: SuspendUserBody, adminId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        updatedAt: Date;
    }>;
    /**
     * Activate a suspended/deactivated user.
     */
    activateUser(userId: string, adminId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        updatedAt: Date;
    }>;
    /**
     * Get user's booking history (admin view).
     */
    getUserBookings(userId: string, page?: number, limit?: number): Promise<{
        bookings: ({
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
                ticketNumber: string;
                pnrNumber: string;
                pdfUrl: string | null;
                storageKey: string | null;
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
                gatewayOrderId: string | null;
                gatewayPaymentId: string | null;
                gatewaySignature: string | null;
                merchantTxnId: string;
                webhookVerified: boolean;
                attempts: number;
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
        })[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
    /**
     * Get user's payment history.
     */
    getUserPayments(userId: string, page?: number, limit?: number): Promise<{
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
            gatewayOrderId: string | null;
            gatewayPaymentId: string | null;
            gatewaySignature: string | null;
            merchantTxnId: string;
            webhookVerified: boolean;
            attempts: number;
        }[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
    /**
     * Get user's wallet transactions.
     */
    getUserWallet(userId: string, page?: number, limit?: number): Promise<{
        transactions: {
            type: import(".prisma/client").$Enums.WalletTransactionType;
            userId: string;
            id: string;
            createdAt: Date;
            idempotencyKey: string | null;
            amount: Prisma.Decimal;
            balanceAfter: Prisma.Decimal;
            referenceType: string;
            referenceId: string | null;
            description: string | null;
        }[];
        pagination: import("../admin.utils").PaginationMeta;
    }>;
}
//# sourceMappingURL=user-management.service.d.ts.map