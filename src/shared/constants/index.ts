// ---------------------------------------------------------------------------
// Application-wide constants — never scattered across files
// ---------------------------------------------------------------------------

/** Booking lifecycle states */
export const BookingStatus = {
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
} as const;

export type BookingStatusType = typeof BookingStatus[keyof typeof BookingStatus];

/** Valid booking state transitions */
export const VALID_BOOKING_TRANSITIONS: Record<BookingStatusType, BookingStatusType[]> = {
  [BookingStatus.INITIATED]: [BookingStatus.HOLD_REQUESTED],
  [BookingStatus.HOLD_REQUESTED]: [BookingStatus.HELD, BookingStatus.HOLD_FAILED],
  [BookingStatus.HELD]: [BookingStatus.PAYMENT_PENDING, BookingStatus.HOLD_EXPIRED],
  [BookingStatus.PAYMENT_PENDING]: [
    BookingStatus.PAYMENT_SUCCESS,
    BookingStatus.PAYMENT_FAILED,
    BookingStatus.HOLD_EXPIRED,
  ],
  [BookingStatus.PAYMENT_SUCCESS]: [BookingStatus.BOOKING_REQUESTED],
  [BookingStatus.PAYMENT_FAILED]: [],
  [BookingStatus.BOOKING_REQUESTED]: [
    BookingStatus.CONFIRMED,
    BookingStatus.BOOKING_UNKNOWN,
    BookingStatus.BOOKING_FAILED,
  ],
  [BookingStatus.CONFIRMED]: [BookingStatus.CANCELLATION_REQUESTED],
  [BookingStatus.BOOKING_UNKNOWN]: [BookingStatus.CONFIRMED, BookingStatus.BOOKING_FAILED],
  [BookingStatus.BOOKING_FAILED]: [BookingStatus.REFUND_PENDING],
  [BookingStatus.CANCELLATION_REQUESTED]: [BookingStatus.CANCELLED, BookingStatus.CANCELLATION_FAILED],
  [BookingStatus.CANCELLED]: [BookingStatus.REFUND_PENDING],
  [BookingStatus.CANCELLATION_FAILED]: [],
  [BookingStatus.REFUND_PENDING]: [BookingStatus.REFUNDED],
  [BookingStatus.REFUNDED]: [],
  [BookingStatus.HOLD_FAILED]: [],
  [BookingStatus.HOLD_EXPIRED]: [],
};

/** Payment states */
export const PaymentStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

/** Refund states */
export const RefundStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type RefundStatusType = typeof RefundStatus[keyof typeof RefundStatus];

/** Cancellation states */
export const CancellationStatus = {
  PENDING: 'PENDING',
  CHECKING: 'CHECKING',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
} as const;

export type CancellationStatusType = typeof CancellationStatus[keyof typeof CancellationStatus];

/** Hold states */
export const HoldStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  USED: 'USED',
  RELEASED: 'RELEASED',
  FAILED: 'FAILED',
} as const;

export type HoldStatusType = typeof HoldStatus[keyof typeof HoldStatus];

/** Seat availability status (from GDS provider) */
export const SeatStatus = {
  NOT_AVAILABLE: 0,
  AVAILABLE_ALL: 1,
  AVAILABLE_MALE: 2,
  AVAILABLE_FEMALE: 3,
  BOOKED_MALE: -2,
  BOOKED_FEMALE: -3,
} as const;

/** Seat type IDs (from GDS provider) */
export const SeatType = {
  SEATING: 1,
  SLEEPER: 2,
  SEMI_SLEEPER: 4,
} as const;

/** User roles — ordered by privilege level */
export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  SUPPORT: 'SUPPORT',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

/** Account status */
export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
} as const;

export type AccountStatusType = typeof AccountStatus[keyof typeof AccountStatus];

/** Notification channels */
export const NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  PUSH: 'PUSH',
} as const;

/** Notification types */
export const NotificationType = {
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
} as const;

/** Wallet transaction types */
export const WalletTransactionType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
  REFUND: 'REFUND',
  REVERSAL: 'REVERSAL',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

/** Audit action types */
export const AuditAction = {
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
} as const;

/** GDS Provider BookingStatus response codes */
export const GDSBookingStatusCode = {
  SUCCESS: 1,
  IN_PROGRESS: 0,
  FAILED: -1,
  NOT_FOUND: -2,
} as const;

/** Redis key namespace prefixes */
export const RedisPrefix = {
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
} as const;

/** Queue names */
export const QueueName = {
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
} as const;

/** HTTP timeout defaults */
export const Timeouts = {
  PROVIDER_CONNECT_MS: 5000,
  PROVIDER_REQUEST_MS: 15000,
  PAYMENT_GATEWAY_MS: 30000,
  DEFAULT_REQUEST_MS: 30000,
} as const;
