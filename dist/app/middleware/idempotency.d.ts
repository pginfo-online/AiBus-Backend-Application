import { Request, Response, NextFunction } from "express";
export declare function idempotencyMiddleware(ttlHours?: number): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map