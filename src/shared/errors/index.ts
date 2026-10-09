// ---------------------------------------------------------------------------
// Application error taxonomy — machine-readable, stable codes
// ---------------------------------------------------------------------------

export interface AppErrorOptions {
  code: string;
  message: string;
  statusCode: number;
  isOperational?: boolean;
  cause?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Base application error. All domain/business errors extend this.
 * 
 * - `isOperational` = true → expected business error (user input, provider failure)
 * - `isOperational` = false → programmer error, bug, unexpected state
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
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

// ---------------------------------------------------------------------------
// Auth errors
// ---------------------------------------------------------------------------
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', cause?: Error) {
    super({ code: 'AUTH_INVALID', message, statusCode: 401, cause });
    this.name = 'AuthenticationError';
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired', cause?: Error) {
    super({ code: 'AUTH_EXPIRED', message, statusCode: 401, cause });
    this.name = 'TokenExpiredError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', cause?: Error) {
    super({ code: 'AUTH_FORBIDDEN', message, statusCode: 403, cause });
    this.name = 'AuthorizationError';
  }
}

// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super({ code: 'VALIDATION_ERROR', message, statusCode: 400, metadata });
    this.name = 'ValidationError';
  }
}

// ---------------------------------------------------------------------------
// Resource errors
// ---------------------------------------------------------------------------
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super({ code: `${resource.toUpperCase().replace(/\s+/g, '_')}_NOT_FOUND`, message: msg, statusCode: 404 });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super({ code, message, statusCode: 409 });
    this.name = 'ConflictError';
  }
}

// ---------------------------------------------------------------------------
// Seat / Booking errors
// ---------------------------------------------------------------------------
export class SeatUnavailableError extends AppError {
  constructor(seatNo?: string) {
    const msg = seatNo
      ? `Seat ${seatNo} is no longer available`
      : 'Selected seat is no longer available';
    super({ code: 'SEAT_NOT_AVAILABLE', message: msg, statusCode: 409 });
    this.name = 'SeatUnavailableError';
  }
}

export class SeatHoldFailedError extends AppError {
  constructor(message = 'Failed to hold selected seats', cause?: Error) {
    super({ code: 'SEAT_HOLD_FAILED', message, statusCode: 409, cause });
    this.name = 'SeatHoldFailedError';
  }
}

export class SeatHoldExpiredError extends AppError {
  constructor(message = 'Seat hold has expired') {
    super({ code: 'SEAT_HOLD_EXPIRED', message, statusCode: 410 });
    this.name = 'SeatHoldExpiredError';
  }
}

export class BookingFailedError extends AppError {
  constructor(message = 'Booking failed', cause?: Error) {
    super({ code: 'BOOKING_FAILED', message, statusCode: 500, cause });
    this.name = 'BookingFailedError';
  }
}

export class BookingUnknownError extends AppError {
  constructor(message = 'Booking status is unknown — reconciliation in progress') {
    super({ code: 'BOOKING_UNKNOWN', message, statusCode: 202, isOperational: true });
    this.name = 'BookingUnknownError';
  }
}

// ---------------------------------------------------------------------------
// Payment errors
// ---------------------------------------------------------------------------
export class PaymentFailedError extends AppError {
  constructor(message = 'Payment failed', cause?: Error) {
    super({ code: 'PAYMENT_FAILED', message, statusCode: 402, cause });
    this.name = 'PaymentFailedError';
  }
}

export class PaymentPendingError extends AppError {
  constructor(message = 'Payment is still pending') {
    super({ code: 'PAYMENT_PENDING', message, statusCode: 202 });
    this.name = 'PaymentPendingError';
  }
}

// ---------------------------------------------------------------------------
// Cancellation / Refund errors
// ---------------------------------------------------------------------------
export class CancellationNotAllowedError extends AppError {
  constructor(message = 'Cancellation is not allowed for this booking') {
    super({ code: 'CANCELLATION_NOT_ALLOWED', message, statusCode: 422 });
    this.name = 'CancellationNotAllowedError';
  }
}

export class CancellationFailedError extends AppError {
  constructor(message = 'Cancellation failed', cause?: Error) {
    super({ code: 'CANCELLATION_FAILED', message, statusCode: 500, cause });
    this.name = 'CancellationFailedError';
  }
}

export class RefundFailedError extends AppError {
  constructor(message = 'Refund processing failed', cause?: Error) {
    super({ code: 'REFUND_FAILED', message, statusCode: 500, cause });
    this.name = 'RefundFailedError';
  }
}

// ---------------------------------------------------------------------------
// Provider errors
// ---------------------------------------------------------------------------
export class ProviderTimeoutError extends AppError {
  constructor(provider: string, cause?: Error) {
    super({
      code: 'PROVIDER_TIMEOUT',
      message: `Provider ${provider} request timed out`,
      statusCode: 504,
      cause,
    });
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderCircuitBreakerOpenError extends AppError {
  constructor(message = 'Provider circuit breaker is OPEN') {
    super({
      code: 'PROVIDER_CIRCUIT_OPEN',
      message,
      statusCode: 503,
    });
    this.name = 'ProviderCircuitBreakerOpenError';
  }
}

export class ProviderUnavailableError extends AppError {
  constructor(provider: string, cause?: Error) {
    super({
      code: 'PROVIDER_UNAVAILABLE',
      message: `Provider ${provider} is currently unavailable`,
      statusCode: 503,
      cause,
    });
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderRateLimitedError extends AppError {
  constructor(provider: string) {
    super({
      code: 'PROVIDER_RATE_LIMITED',
      message: `Provider ${provider} rate limit exceeded`,
      statusCode: 429,
    });
    this.name = 'ProviderRateLimitedError';
  }
}

export class ProviderError extends AppError {
  constructor(provider: string, message: string, cause?: Error) {
    super({
      code: 'PROVIDER_ERROR',
      message: `Provider ${provider}: ${message}`,
      statusCode: 502,
      cause,
    });
    this.name = 'ProviderError';
  }
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super({ code: 'RATE_LIMITED', message, statusCode: 429 });
    this.name = 'RateLimitError';
  }
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------
export class IdempotencyConflictError extends AppError {
  constructor(message = 'Request with this idempotency key is already being processed') {
    super({ code: 'IDEMPOTENCY_CONFLICT', message, statusCode: 409 });
    this.name = 'IdempotencyConflictError';
  }
}

// ---------------------------------------------------------------------------
// Internal errors
// ---------------------------------------------------------------------------
export class InternalError extends AppError {
  constructor(message = 'An internal error occurred', cause?: Error) {
    super({ code: 'INTERNAL_ERROR', message, statusCode: 500, isOperational: false, cause });
    this.name = 'InternalError';
  }
}

// ---------------------------------------------------------------------------
// State transition error
// ---------------------------------------------------------------------------
export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string, entity = 'Booking') {
    super({
      code: 'INVALID_STATE_TRANSITION',
      message: `Invalid ${entity} state transition from ${from} to ${to}`,
      statusCode: 409,
    });
    this.name = 'InvalidStateTransitionError';
  }
}

// ---------------------------------------------------------------------------
// Client / Admin domain errors
// ---------------------------------------------------------------------------
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', metadata?: Record<string, unknown>) {
    super({ code: 'BAD_REQUEST', message, statusCode: 400, metadata });
    this.name = 'BadRequestError';
  }
}

export class AdminActionDeniedError extends AppError {
  constructor(message = 'Admin action denied', metadata?: Record<string, unknown>) {
    super({ code: 'ADMIN_ACTION_DENIED', message, statusCode: 403, metadata });
    this.name = 'AdminActionDeniedError';
  }
}

export class InvalidConfigError extends AppError {
  constructor(message = 'Invalid system configuration', metadata?: Record<string, unknown>) {
    super({ code: 'INVALID_CONFIG', message, statusCode: 400, metadata });
    this.name = 'InvalidConfigError';
  }
}

