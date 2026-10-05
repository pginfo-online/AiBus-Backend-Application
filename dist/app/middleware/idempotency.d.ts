import { Request, Response, NextFunction } from 'express';
/**
 * Idempotency middleware guaranteeing exactly-once semantics for mutations.
 * Reads 'Idempotency-Key' header, records request hash, and replays cached responses.
 */
export declare function idempotencyMiddleware(ttlHours?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map