import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler. Converts all errors to the standard API envelope.
 *
 * - AppError subclasses → use their code, status, message
 * - Unknown errors → 500 INTERNAL_ERROR, no stack leak in production
 */
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
/**
 * 404 handler for unmatched routes.
 */
export declare function notFoundHandler(req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=errorHandler.d.ts.map