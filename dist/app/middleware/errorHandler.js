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
    // Handle malformed JSON body
    if (err instanceof SyntaxError && 'body' in err) {
        logger_1.logger.warn({ requestId, err: err.message }, 'Malformed JSON body in request');
        res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_JSON',
                message: 'Malformed JSON payload provided in request body',
                requestId,
            },
        });
        return;
    }
    // Handle payload too large
    if (err.name === 'PayloadTooLargeError' || err.type === 'entity.too.large') {
        logger_1.logger.warn({ requestId }, 'Request payload exceeded size limit');
        res.status(413).json({
            success: false,
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: 'Request payload exceeds maximum allowed size',
                requestId,
            },
        });
        return;
    }
    // Handle CORS rejection
    if (err.message === 'Origin not allowed by CORS') {
        logger_1.logger.warn({ requestId, origin: req.headers.origin }, 'CORS request rejected');
        res.status(403).json({
            success: false,
            error: {
                code: 'CORS_FORBIDDEN',
                message: 'Origin not allowed by CORS policy',
                requestId,
            },
        });
        return;
    }
    // Handle Prisma known request errors
    const prismaCode = err.code;
    if (prismaCode === 'P2002') {
        logger_1.logger.warn({ requestId, target: err.meta?.target }, 'Prisma unique constraint conflict');
        res.status(409).json({
            success: false,
            error: {
                code: 'CONFLICT',
                message: 'A resource with these details already exists',
                requestId,
            },
        });
        return;
    }
    if (prismaCode === 'P2025') {
        logger_1.logger.warn({ requestId }, 'Prisma record not found');
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Requested resource could not be found',
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