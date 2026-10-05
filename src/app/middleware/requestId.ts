import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Request ID middleware — assigns a unique ID to every request for tracing
// ---------------------------------------------------------------------------

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
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers['x-request-id'] as string) || uuidv4();

  req.requestId = requestId;
  req.startTime = Date.now();

  // Echo back for client correlation
  res.setHeader('X-Request-Id', requestId);

  next();
}
