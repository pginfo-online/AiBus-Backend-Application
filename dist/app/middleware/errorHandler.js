"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const env_1 = require("../../config/env");
// ---------------------------------------------------------------------------
// Centralized error handling middleware — must be the last middleware
// ---------------------------------------------------------------------------
/**
 * Global error handler. Converts all errors to the standard API envelope.
 *
 * - AppError subclasses → use their code, status, message
 * - Unknown errors → 500 INTERNAL_ERROR, no stack leak in production
 */
function errorHandler(err, req, res, _next) {
    const requestId = req.requestId || 'unknown';
    if (err instanceof errors_1.AppError) {
        // Operational error — expected business failure
        const level = err.statusCode >= 500 ? 'error' : 'warn';
        logger_1.logger[level]({
            requestId,
            errorCode: err.code,
            statusCode: err.statusCode,
            message: err.message,
            metadata: err.metadata,
            ...(err.cause ? { cause: err.cause.message } : {}),
        }, `${err.name}: ${err.message}`);
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(Object.keys(err.metadata).length > 0
                    ? { details: err.metadata }
                    : {}),
                requestId,
            },
        });
        return;
    }
    // Unexpected error — log full details, return generic message
    logger_1.logger.error({
        requestId,
        err,
        stack: err.stack,
    }, `Unhandled error: ${err.message}`);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: env_1.isProduction
                ? 'An internal error occurred'
                : err.message,
            requestId,
        },
    });
}
/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res, _next) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
            requestId: req.requestId || 'unknown',
        },
    });
}
//# sourceMappingURL=errorHandler.js.map