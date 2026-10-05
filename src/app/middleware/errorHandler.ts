import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { isProduction } from '../../config/env';

// ---------------------------------------------------------------------------
// Centralized error handling middleware — must be the last middleware
// ---------------------------------------------------------------------------

/**
 * Global error handler. Converts all errors to the standard API envelope.
 * 
 * - AppError subclasses → use their code, status, message
 * - Unknown errors → 500 INTERNAL_ERROR, no stack leak in production
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';

  if (err instanceof AppError) {
    // Operational error — expected business failure
    const level = err.statusCode >= 500 ? 'error' : 'warn';
    logger[level](
      {
        requestId,
        errorCode: err.code,
        statusCode: err.statusCode,
        message: err.message,
        metadata: err.metadata,
        ...(err.cause ? { cause: (err.cause as Error).message } : {}),
      },
      `${err.name}: ${err.message}`
    );

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
  logger.error(
    {
      requestId,
      err,
      stack: err.stack,
    },
    `Unhandled error: ${err.message}`
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'An internal error occurred'
        : err.message,
      requestId,
    },
  });
}

/**
 * 404 handler for unmatched routes.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId || 'unknown',
    },
  });
}
