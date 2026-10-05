"use strict";
// ---------------------------------------------------------------------------
// Application error taxonomy — machine-readable, stable codes
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidStateTransitionError = exports.InternalError = exports.IdempotencyConflictError = exports.RateLimitError = exports.ProviderError = exports.ProviderRateLimitedError = exports.ProviderUnavailableError = exports.ProviderCircuitBreakerOpenError = exports.ProviderTimeoutError = exports.RefundFailedError = exports.CancellationFailedError = exports.CancellationNotAllowedError = exports.PaymentPendingError = exports.PaymentFailedError = exports.BookingUnknownError = exports.BookingFailedError = exports.SeatHoldExpiredError = exports.SeatHoldFailedError = exports.SeatUnavailableError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.TokenExpiredError = exports.AuthenticationError = exports.AppError = void 0;
/**
 * Base application error. All domain/business errors extend this.
 *
 * - `isOperational` = true → expected business error (user input, provider failure)
 * - `isOperational` = false → programmer error, bug, unexpected state
 */
class AppError extends Error {
    code;
    statusCode;
    isOperational;
    metadata;
    constructor(options) {
        super(options.message);
        this.name = 'AppError';
        this.code = options.code;
        this.statusCode = options.statusCode;
        this.isOperational = options.isOperational ?? true;
        this.metadata = options.metadata ?? {};
        if (options.cause) {
            this.cause = options.cause;
        }
        // Capture proper stack trace (V8 only)
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// ---------------------------------------------------------------------------
// Auth errors
// ---------------------------------------------------------------------------
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', cause) {
        super({ code: 'AUTH_INVALID', message, statusCode: 401, cause });
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class TokenExpiredError extends AppError {
    constructor(message = 'Token has expired', cause) {
        super({ code: 'AUTH_EXPIRED', message, statusCode: 401, cause });
        this.name = 'TokenExpiredError';
    }
}
exports.TokenExpiredError = TokenExpiredError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions', cause) {
        super({ code: 'AUTH_FORBIDDEN', message, statusCode: 403, cause });
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------
class ValidationError extends AppError {
    constructor(message, metadata) {
        super({ code: 'VALIDATION_ERROR', message, statusCode: 400, metadata });
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
// ---------------------------------------------------------------------------
// Resource errors
// ---------------------------------------------------------------------------
class NotFoundError extends AppError {
    constructor(resource, identifier) {
        const msg = identifier
            ? `${resource} not found: ${identifier}`
            : `${resource} not found`;
        super({ code: `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`, message: msg, statusCode: 404 });
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, code = 'CONFLICT') {
        super({ code, message, statusCode: 409 });
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
// ---------------------------------------------------------------------------
// Seat / Booking errors
// ---------------------------------------------------------------------------
class SeatUnavailableError extends AppError {
    constructor(seatNo) {
        const msg = seatNo
            ? `Seat ${seatNo} is no longer available`
            : 'Selected seat is no longer available';
        super({ code: 'SEAT_NOT_AVAILABLE', message: msg, statusCode: 409 });
        this.name = 'SeatUnavailableError';
    }
}
exports.SeatUnavailableError = SeatUnavailableError;
class SeatHoldFailedError extends AppError {
    constructor(message = 'Failed to hold selected seats', cause) {
        super({ code: 'SEAT_HOLD_FAILED', message, statusCode: 409, cause });
        this.name = 'SeatHoldFailedError';
    }
}
exports.SeatHoldFailedError = SeatHoldFailedError;
class SeatHoldExpiredError extends AppError {
    constructor(message = 'Seat hold has expired') {
        super({ code: 'SEAT_HOLD_EXPIRED', message, statusCode: 410 });
        this.name = 'SeatHoldExpiredError';
    }
}
exports.SeatHoldExpiredError = SeatHoldExpiredError;
class BookingFailedError extends AppError {
    constructor(message = 'Booking failed', cause) {
        super({ code: 'BOOKING_FAILED', message, statusCode: 500, cause });
        this.name = 'BookingFailedError';
    }
}
exports.BookingFailedError = BookingFailedError;
class BookingUnknownError extends AppError {
    constructor(message = 'Booking status is unknown — reconciliation in progress') {
        super({ code: 'BOOKING_UNKNOWN', message, statusCode: 202, isOperational: true });
        this.name = 'BookingUnknownError';
    }
}
exports.BookingUnknownError = BookingUnknownError;
// ---------------------------------------------------------------------------
// Payment errors
// ---------------------------------------------------------------------------
class PaymentFailedError extends AppError {
    constructor(message = 'Payment failed', cause) {
        super({ code: 'PAYMENT_FAILED', message, statusCode: 402, cause });
        this.name = 'PaymentFailedError';
    }
}
exports.PaymentFailedError = PaymentFailedError;
class PaymentPendingError extends AppError {
    constructor(message = 'Payment is still pending') {
        super({ code: 'PAYMENT_PENDING', message, statusCode: 202 });
        this.name = 'PaymentPendingError';
    }
}
exports.PaymentPendingError = PaymentPendingError;
// ---------------------------------------------------------------------------
// Cancellation / Refund errors
// ---------------------------------------------------------------------------
class CancellationNotAllowedError extends AppError {
    constructor(message = 'Cancellation is not allowed for this booking') {
        super({ code: 'CANCELLATION_NOT_ALLOWED', message, statusCode: 422 });
        this.name = 'CancellationNotAllowedError';
    }
}
exports.CancellationNotAllowedError = CancellationNotAllowedError;
class CancellationFailedError extends AppError {
    constructor(message = 'Cancellation failed', cause) {
        super({ code: 'CANCELLATION_FAILED', message, statusCode: 500, cause });
        this.name = 'CancellationFailedError';
    }
}
exports.CancellationFailedError = CancellationFailedError;
class RefundFailedError extends AppError {
    constructor(message = 'Refund processing failed', cause) {
        super({ code: 'REFUND_FAILED', message, statusCode: 500, cause });
        this.name = 'RefundFailedError';
    }
}
exports.RefundFailedError = RefundFailedError;
// ---------------------------------------------------------------------------
// Provider errors
// ---------------------------------------------------------------------------
class ProviderTimeoutError extends AppError {
    constructor(provider, cause) {
        super({
            code: 'PROVIDER_TIMEOUT',
            message: `Provider ${provider} request timed out`,
            statusCode: 504,
            cause,
        });
        this.name = 'ProviderTimeoutError';
    }
}
exports.ProviderTimeoutError = ProviderTimeoutError;
class ProviderCircuitBreakerOpenError extends AppError {
    constructor(message = 'Provider circuit breaker is OPEN') {
        super({
            code: 'PROVIDER_CIRCUIT_OPEN',
            message,
            statusCode: 503,
        });
        this.name = 'ProviderCircuitBreakerOpenError';
    }
}
exports.ProviderCircuitBreakerOpenError = ProviderCircuitBreakerOpenError;
class ProviderUnavailableError extends AppError {
    constructor(provider, cause) {
        super({
            code: 'PROVIDER_UNAVAILABLE',
            message: `Provider ${provider} is currently unavailable`,
            statusCode: 503,
            cause,
        });
        this.name = 'ProviderUnavailableError';
    }
}
exports.ProviderUnavailableError = ProviderUnavailableError;
class ProviderRateLimitedError extends AppError {
    constructor(provider) {
        super({
            code: 'PROVIDER_RATE_LIMITED',
            message: `Provider ${provider} rate limit exceeded`,
            statusCode: 429,
        });
        this.name = 'ProviderRateLimitedError';
    }
}
exports.ProviderRateLimitedError = ProviderRateLimitedError;
class ProviderError extends AppError {
    constructor(provider, message, cause) {
        super({
            code: 'PROVIDER_ERROR',
            message: `Provider ${provider}: ${message}`,
            statusCode: 502,
            cause,
        });
        this.name = 'ProviderError';
    }
}
exports.ProviderError = ProviderError;
// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
class RateLimitError extends AppError {
    constructor(message = 'Too many requests, please try again later') {
        super({ code: 'RATE_LIMITED', message, statusCode: 429 });
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------
class IdempotencyConflictError extends AppError {
    constructor(message = 'Request with this idempotency key is already being processed') {
        super({ code: 'IDEMPOTENCY_CONFLICT', message, statusCode: 409 });
        this.name = 'IdempotencyConflictError';
    }
}
exports.IdempotencyConflictError = IdempotencyConflictError;
// ---------------------------------------------------------------------------
// Internal errors
// ---------------------------------------------------------------------------
class InternalError extends AppError {
    constructor(message = 'An internal error occurred', cause) {
        super({ code: 'INTERNAL_ERROR', message, statusCode: 500, isOperational: false, cause });
        this.name = 'InternalError';
    }
}
exports.InternalError = InternalError;
// ---------------------------------------------------------------------------
// State transition error
// ---------------------------------------------------------------------------
class InvalidStateTransitionError extends AppError {
    constructor(from, to, entity = 'Booking') {
        super({
            code: 'INVALID_STATE_TRANSITION',
            message: `Invalid ${entity} state transition from ${from} to ${to}`,
            statusCode: 409,
        });
        this.name = 'InvalidStateTransitionError';
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
//# sourceMappingURL=index.js.map