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
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly metadata: Record<string, unknown>;
    constructor(options: AppErrorOptions);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class TokenExpiredError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class ValidationError extends AppError {
    constructor(message: string, metadata?: Record<string, unknown>);
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, code?: string);
}
export declare class SeatUnavailableError extends AppError {
    constructor(seatNo?: string);
}
export declare class SeatHoldFailedError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class SeatHoldExpiredError extends AppError {
    constructor(message?: string);
}
export declare class BookingFailedError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class BookingUnknownError extends AppError {
    constructor(message?: string);
}
export declare class PaymentFailedError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class PaymentPendingError extends AppError {
    constructor(message?: string);
}
export declare class CancellationNotAllowedError extends AppError {
    constructor(message?: string);
}
export declare class CancellationFailedError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class RefundFailedError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class ProviderTimeoutError extends AppError {
    constructor(provider: string, cause?: Error);
}
export declare class ProviderCircuitBreakerOpenError extends AppError {
    constructor(message?: string);
}
export declare class ProviderUnavailableError extends AppError {
    constructor(provider: string, cause?: Error);
}
export declare class ProviderRateLimitedError extends AppError {
    constructor(provider: string);
}
export declare class ProviderError extends AppError {
    constructor(provider: string, message: string, cause?: Error);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class IdempotencyConflictError extends AppError {
    constructor(message?: string);
}
export declare class InternalError extends AppError {
    constructor(message?: string, cause?: Error);
}
export declare class InvalidStateTransitionError extends AppError {
    constructor(from: string, to: string, entity?: string);
}
//# sourceMappingURL=index.d.ts.map