/** Booking lifecycle states */
export declare const BookingStatus: {
    readonly INITIATED: "INITIATED";
    readonly HOLD_REQUESTED: "HOLD_REQUESTED";
    readonly HELD: "HELD";
    readonly PAYMENT_PENDING: "PAYMENT_PENDING";
    readonly PAYMENT_SUCCESS: "PAYMENT_SUCCESS";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly BOOKING_REQUESTED: "BOOKING_REQUESTED";
    readonly CONFIRMED: "CONFIRMED";
    readonly BOOKING_UNKNOWN: "BOOKING_UNKNOWN";
    readonly BOOKING_FAILED: "BOOKING_FAILED";
    readonly CANCELLATION_REQUESTED: "CANCELLATION_REQUESTED";
    readonly CANCELLED: "CANCELLED";
    readonly CANCELLATION_FAILED: "CANCELLATION_FAILED";
    readonly REFUND_PENDING: "REFUND_PENDING";
    readonly REFUNDED: "REFUNDED";
    readonly HOLD_FAILED: "HOLD_FAILED";
    readonly HOLD_EXPIRED: "HOLD_EXPIRED";
};
export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus];
/** Valid booking state transitions */
export declare const VALID_BOOKING_TRANSITIONS: Record<BookingStatusType, BookingStatusType[]>;
/** Payment states */
export declare const PaymentStatus: {
    readonly PENDING: "PENDING";
    readonly PROCESSING: "PROCESSING";
    readonly SUCCESS: "SUCCESS";
    readonly FAILED: "FAILED";
    readonly REFUND_PENDING: "REFUND_PENDING";
    readonly REFUNDED: "REFUNDED";
    readonly PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED";
};
export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];
/** Refund states */
export declare const RefundStatus: {
    readonly PENDING: "PENDING";
    readonly PROCESSING: "PROCESSING";
    readonly SUCCESS: "SUCCESS";
    readonly FAILED: "FAILED";
};
export type RefundStatusType = typeof RefundStatus[keyof typeof RefundStatus];
/** Cancellation states */
export declare const CancellationStatus: {
    readonly PENDING: "PENDING";
    readonly CHECKING: "CHECKING";
    readonly APPROVED: "APPROVED";
    readonly PROCESSING: "PROCESSING";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly REJECTED: "REJECTED";
};
export type CancellationStatusType = typeof CancellationStatus[keyof typeof CancellationStatus];
/** Hold states */
export declare const HoldStatus: {
    readonly PENDING: "PENDING";
    readonly ACTIVE: "ACTIVE";
    readonly EXPIRED: "EXPIRED";
    readonly USED: "USED";
    readonly RELEASED: "RELEASED";
    readonly FAILED: "FAILED";
};
export type HoldStatusType = typeof HoldStatus[keyof typeof HoldStatus];
/** Seat availability status (from GDS provider) */
export declare const SeatStatus: {
    readonly NOT_AVAILABLE: 0;
    readonly AVAILABLE_ALL: 1;
    readonly AVAILABLE_MALE: 2;
    readonly AVAILABLE_FEMALE: 3;
    readonly BOOKED_MALE: -2;
    readonly BOOKED_FEMALE: -3;
};
/** Seat type IDs (from GDS provider) */
export declare const SeatType: {
    readonly SEATING: 1;
    readonly SLEEPER: 2;
    readonly SEMI_SLEEPER: 4;
};
/** User roles — ordered by privilege level */
export declare const UserRole: {
    readonly CUSTOMER: "CUSTOMER";
    readonly OPERATOR_AGENT: "OPERATOR_AGENT";
    readonly SUPPORT_AGENT: "SUPPORT_AGENT";
    readonly SUPPORT: "SUPPORT";
    readonly ADMIN: "ADMIN";
    readonly SUPER_ADMIN: "SUPER_ADMIN";
};
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
/** Account status */
export declare const AccountStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly SUSPENDED: "SUSPENDED";
    readonly DEACTIVATED: "DEACTIVATED";
};
export type AccountStatusType = typeof AccountStatus[keyof typeof AccountStatus];
/** Notification channels */
export declare const NotificationChannel: {
    readonly EMAIL: "EMAIL";
    readonly SMS: "SMS";
    readonly PUSH: "PUSH";
};
/** Notification types */
export declare const NotificationType: {
    readonly BOOKING_CONFIRMED: "BOOKING_CONFIRMED";
    readonly BOOKING_FAILED: "BOOKING_FAILED";
    readonly PAYMENT_SUCCESS: "PAYMENT_SUCCESS";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly CANCELLATION_SUCCESS: "CANCELLATION_SUCCESS";
    readonly REFUND_INITIATED: "REFUND_INITIATED";
    readonly REFUND_COMPLETED: "REFUND_COMPLETED";
    readonly TICKET_GENERATED: "TICKET_GENERATED";
    readonly HOLD_EXPIRING: "HOLD_EXPIRING";
    readonly PASSWORD_CHANGED: "PASSWORD_CHANGED";
};
/** Wallet transaction types */
export declare const WalletTransactionType: {
    readonly CREDIT: "CREDIT";
    readonly DEBIT: "DEBIT";
    readonly REFUND: "REFUND";
    readonly REVERSAL: "REVERSAL";
    readonly ADJUSTMENT: "ADJUSTMENT";
};
/** Audit action types */
export declare const AuditAction: {
    readonly LOGIN: "LOGIN";
    readonly LOGOUT: "LOGOUT";
    readonly SIGNUP: "SIGNUP";
    readonly PASSWORD_CHANGE: "PASSWORD_CHANGE";
    readonly BOOKING_CREATED: "BOOKING_CREATED";
    readonly BOOKING_CONFIRMED: "BOOKING_CONFIRMED";
    readonly BOOKING_CANCELLED: "BOOKING_CANCELLED";
    readonly SEAT_HELD: "SEAT_HELD";
    readonly SEAT_RELEASED: "SEAT_RELEASED";
    readonly PAYMENT_INITIATED: "PAYMENT_INITIATED";
    readonly PAYMENT_COMPLETED: "PAYMENT_COMPLETED";
    readonly PAYMENT_FAILED: "PAYMENT_FAILED";
    readonly REFUND_INITIATED: "REFUND_INITIATED";
    readonly REFUND_COMPLETED: "REFUND_COMPLETED";
    readonly ADMIN_ACTION: "ADMIN_ACTION";
    readonly PROVIDER_CONFIG_CHANGE: "PROVIDER_CONFIG_CHANGE";
    readonly USER_UPDATED: "USER_UPDATED";
    readonly USER_SUSPENDED: "USER_SUSPENDED";
};
/** GDS Provider BookingStatus response codes */
export declare const GDSBookingStatusCode: {
    readonly SUCCESS: 1;
    readonly IN_PROGRESS: 0;
    readonly FAILED: -1;
    readonly NOT_FOUND: -2;
};
/** Redis key namespace prefixes */
export declare const RedisPrefix: {
    readonly CACHE_CITIES: "cache:cities";
    readonly CACHE_SEARCH: "cache:search";
    readonly CACHE_CHART: "cache:chart";
    readonly LOCK_SEAT: "lock:seat";
    readonly LOCK_PROVIDER_AUTH: "lock:provider-auth";
    readonly LOCK_BOOKING: "lock:booking";
    readonly SESSION_REFRESH: "session:refresh";
    readonly RATE_API: "rate:api";
    readonly RATE_AUTH: "rate:auth";
    readonly RATE_BOOKING: "rate:booking";
    readonly IDEMPOTENCY: "idem";
    readonly PROVIDER_TOKEN: "provider:token";
    readonly PROVIDER_HEALTH: "provider:health";
};
/** Queue names */
export declare const QueueName: {
    readonly BOOKING_RECONCILIATION: "booking-reconciliation";
    readonly PAYMENT_RECONCILIATION: "payment-reconciliation";
    readonly REFUND_PROCESSING: "refund-processing";
    readonly TICKET_GENERATION: "ticket-generation";
    readonly NOTIFICATION_EMAIL: "notification-email";
    readonly NOTIFICATION_SMS: "notification-sms";
    readonly NOTIFICATION_PUSH: "notification-push";
    readonly PROVIDER_HEALTH: "provider-health";
    readonly HOLD_EXPIRY_CLEANUP: "hold-expiry-cleanup";
    readonly AUDIT_LOG: "audit-log";
};
/** HTTP timeout defaults */
export declare const Timeouts: {
    readonly PROVIDER_CONNECT_MS: 5000;
    readonly PROVIDER_REQUEST_MS: 15000;
    readonly PAYMENT_GATEWAY_MS: 30000;
    readonly DEFAULT_REQUEST_MS: 30000;
};
//# sourceMappingURL=index.d.ts.map