"use strict";
// ---------------------------------------------------------------------------
// Application-wide constants — never scattered across files
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeouts = exports.QueueName = exports.RedisPrefix = exports.GDSBookingStatusCode = exports.AuditAction = exports.WalletTransactionType = exports.NotificationType = exports.NotificationChannel = exports.AccountStatus = exports.UserRole = exports.SeatType = exports.SeatStatus = exports.HoldStatus = exports.CancellationStatus = exports.RefundStatus = exports.PaymentStatus = exports.VALID_BOOKING_TRANSITIONS = exports.BookingStatus = void 0;
/** Booking lifecycle states */
exports.BookingStatus = {
    INITIATED: 'INITIATED',
    HOLD_REQUESTED: 'HOLD_REQUESTED',
    HELD: 'HELD',
    PAYMENT_PENDING: 'PAYMENT_PENDING',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    BOOKING_REQUESTED: 'BOOKING_REQUESTED',
    CONFIRMED: 'CONFIRMED',
    BOOKING_UNKNOWN: 'BOOKING_UNKNOWN',
    BOOKING_FAILED: 'BOOKING_FAILED',
    CANCELLATION_REQUESTED: 'CANCELLATION_REQUESTED',
    CANCELLED: 'CANCELLED',
    CANCELLATION_FAILED: 'CANCELLATION_FAILED',
    REFUND_PENDING: 'REFUND_PENDING',
    REFUNDED: 'REFUNDED',
    HOLD_FAILED: 'HOLD_FAILED',
    HOLD_EXPIRED: 'HOLD_EXPIRED',
};
/** Valid booking state transitions */
exports.VALID_BOOKING_TRANSITIONS = {
    [exports.BookingStatus.INITIATED]: [exports.BookingStatus.HOLD_REQUESTED],
    [exports.BookingStatus.HOLD_REQUESTED]: [exports.BookingStatus.HELD, exports.BookingStatus.HOLD_FAILED],
    [exports.BookingStatus.HELD]: [exports.BookingStatus.PAYMENT_PENDING, exports.BookingStatus.HOLD_EXPIRED],
    [exports.BookingStatus.PAYMENT_PENDING]: [
        exports.BookingStatus.PAYMENT_SUCCESS,
        exports.BookingStatus.PAYMENT_FAILED,
        exports.BookingStatus.HOLD_EXPIRED,
    ],
    [exports.BookingStatus.PAYMENT_SUCCESS]: [exports.BookingStatus.BOOKING_REQUESTED],
    [exports.BookingStatus.PAYMENT_FAILED]: [],
    [exports.BookingStatus.BOOKING_REQUESTED]: [
        exports.BookingStatus.CONFIRMED,
        exports.BookingStatus.BOOKING_UNKNOWN,
        exports.BookingStatus.BOOKING_FAILED,
    ],
    [exports.BookingStatus.CONFIRMED]: [exports.BookingStatus.CANCELLATION_REQUESTED],
    [exports.BookingStatus.BOOKING_UNKNOWN]: [exports.BookingStatus.CONFIRMED, exports.BookingStatus.BOOKING_FAILED],
    [exports.BookingStatus.BOOKING_FAILED]: [exports.BookingStatus.REFUND_PENDING],
    [exports.BookingStatus.CANCELLATION_REQUESTED]: [exports.BookingStatus.CANCELLED, exports.BookingStatus.CANCELLATION_FAILED],
    [exports.BookingStatus.CANCELLED]: [exports.BookingStatus.REFUND_PENDING],
    [exports.BookingStatus.CANCELLATION_FAILED]: [],
    [exports.BookingStatus.REFUND_PENDING]: [exports.BookingStatus.REFUNDED],
    [exports.BookingStatus.REFUNDED]: [],
    [exports.BookingStatus.HOLD_FAILED]: [],
    [exports.BookingStatus.HOLD_EXPIRED]: [],
};
/** Payment states */
exports.PaymentStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    REFUND_PENDING: 'REFUND_PENDING',
    REFUNDED: 'REFUNDED',
    PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
};
/** Refund states */
exports.RefundStatus = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
};
/** Cancellation states */
exports.CancellationStatus = {
    PENDING: 'PENDING',
    CHECKING: 'CHECKING',
    APPROVED: 'APPROVED',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    REJECTED: 'REJECTED',
};
/** Hold states */
exports.HoldStatus = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    USED: 'USED',
    RELEASED: 'RELEASED',
    FAILED: 'FAILED',
};
/** Seat availability status (from GDS provider) */
exports.SeatStatus = {
    NOT_AVAILABLE: 0,
    AVAILABLE_ALL: 1,
    AVAILABLE_MALE: 2,
    AVAILABLE_FEMALE: 3,
    BOOKED_MALE: -2,
    BOOKED_FEMALE: -3,
};
/** Seat type IDs (from GDS provider) */
exports.SeatType = {
    SEATING: 1,
    SLEEPER: 2,
    SEMI_SLEEPER: 4,
};
/** User roles — ordered by privilege level */
exports.UserRole = {
    CUSTOMER: 'CUSTOMER',
    SUPPORT: 'SUPPORT',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
};
/** Account status */
exports.AccountStatus = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DEACTIVATED: 'DEACTIVATED',
};
/** Notification channels */
exports.NotificationChannel = {
    EMAIL: 'EMAIL',
    SMS: 'SMS',
    PUSH: 'PUSH',
};
/** Notification types */
exports.NotificationType = {
    BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
    BOOKING_FAILED: 'BOOKING_FAILED',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    CANCELLATION_SUCCESS: 'CANCELLATION_SUCCESS',
    REFUND_INITIATED: 'REFUND_INITIATED',
    REFUND_COMPLETED: 'REFUND_COMPLETED',
    TICKET_GENERATED: 'TICKET_GENERATED',
    HOLD_EXPIRING: 'HOLD_EXPIRING',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
};
/** Wallet transaction types */
exports.WalletTransactionType = {
    CREDIT: 'CREDIT',
    DEBIT: 'DEBIT',
    REFUND: 'REFUND',
    REVERSAL: 'REVERSAL',
    ADJUSTMENT: 'ADJUSTMENT',
};
/** Audit action types */
exports.AuditAction = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    SIGNUP: 'SIGNUP',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    BOOKING_CREATED: 'BOOKING_CREATED',
    BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
    BOOKING_CANCELLED: 'BOOKING_CANCELLED',
    SEAT_HELD: 'SEAT_HELD',
    SEAT_RELEASED: 'SEAT_RELEASED',
    PAYMENT_INITIATED: 'PAYMENT_INITIATED',
    PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    REFUND_INITIATED: 'REFUND_INITIATED',
    REFUND_COMPLETED: 'REFUND_COMPLETED',
    ADMIN_ACTION: 'ADMIN_ACTION',
    PROVIDER_CONFIG_CHANGE: 'PROVIDER_CONFIG_CHANGE',
    USER_UPDATED: 'USER_UPDATED',
    USER_SUSPENDED: 'USER_SUSPENDED',
};
/** GDS Provider BookingStatus response codes */
exports.GDSBookingStatusCode = {
    SUCCESS: 1,
    IN_PROGRESS: 0,
    FAILED: -1,
    NOT_FOUND: -2,
};
/** Redis key namespace prefixes */
exports.RedisPrefix = {
    CACHE_CITIES: 'cache:cities',
    CACHE_SEARCH: 'cache:search',
    CACHE_CHART: 'cache:chart',
    LOCK_SEAT: 'lock:seat',
    LOCK_PROVIDER_AUTH: 'lock:provider-auth',
    LOCK_BOOKING: 'lock:booking',
    SESSION_REFRESH: 'session:refresh',
    RATE_API: 'rate:api',
    RATE_AUTH: 'rate:auth',
    RATE_BOOKING: 'rate:booking',
    IDEMPOTENCY: 'idem',
    PROVIDER_TOKEN: 'provider:token',
    PROVIDER_HEALTH: 'provider:health',
};
/** Queue names */
exports.QueueName = {
    BOOKING_RECONCILIATION: 'booking-reconciliation',
    PAYMENT_RECONCILIATION: 'payment-reconciliation',
    REFUND_PROCESSING: 'refund-processing',
    TICKET_GENERATION: 'ticket-generation',
    NOTIFICATION_EMAIL: 'notification-email',
    NOTIFICATION_SMS: 'notification-sms',
    NOTIFICATION_PUSH: 'notification-push',
    PROVIDER_HEALTH: 'provider-health',
    HOLD_EXPIRY_CLEANUP: 'hold-expiry-cleanup',
    AUDIT_LOG: 'audit-log',
};
/** HTTP timeout defaults */
exports.Timeouts = {
    PROVIDER_CONNECT_MS: 5000,
    PROVIDER_REQUEST_MS: 15000,
    PAYMENT_GATEWAY_MS: 30000,
    DEFAULT_REQUEST_MS: 30000,
};
//# sourceMappingURL=index.js.map