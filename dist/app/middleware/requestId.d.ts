import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}
/**
 * Assigns a unique request ID (from header or generated).
 * This ID is carried through logs, error responses, and downstream calls.
 */
export declare function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=requestId.d.ts.map