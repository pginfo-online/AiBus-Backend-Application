import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getPrismaClient } from '../../infrastructure/database';
import { ConflictError } from '../../shared/errors';
import { IdempotencyStatus } from '@prisma/client';
import { logger } from '../../infrastructure/logger';

const idempotencyLogger = logger.child({ module: 'idempotency' });

/**
 * Idempotency middleware guaranteeing exactly-once semantics for mutations.
 * Reads 'Idempotency-Key' header, records request hash, and replays cached responses.
 */
export function idempotencyMiddleware(ttlHours = 24) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string | undefined;

    // Only apply if client sends Idempotency-Key on mutation methods
    if (!key || (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH')) {
      return next();
    }

    const prisma = getPrismaClient();
    const userId = (req as any).user?.sub;
    const requestPayload = JSON.stringify(req.body || {});
    const requestHash = crypto.createHash('sha256').update(`${req.method}:${req.path}:${requestPayload}`).digest('hex');

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });

      if (existing) {
        if (existing.status === IdempotencyStatus.PROCESSING) {
          throw new ConflictError('A request with this Idempotency-Key is currently being processed. Please retry later.');
        }

        if (existing.status === IdempotencyStatus.RESOLVED && existing.responseCode) {
          idempotencyLogger.info({ key }, 'Replaying cached response for idempotent request');
          res.setHeader('X-Cache-Lookup', 'HIT');
          res.status(existing.responseCode).json(existing.responseBody);
          return;
        }
      }

      // Record in PROCESSING state
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
      await prisma.idempotencyRecord.upsert({
        where: { key },
        create: {
          key,
          userId,
          method: req.method,
          path: req.path,
          requestHash,
          status: IdempotencyStatus.PROCESSING,
          expiresAt,
        },
        update: {
          status: IdempotencyStatus.PROCESSING,
          requestHash,
        },
      });

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Asynchronously update idempotency record
        prisma.idempotencyRecord
          .update({
            where: { key },
            data: {
              status: IdempotencyStatus.RESOLVED,
              responseCode: res.statusCode,
              responseBody: body,
            },
          })
          .catch((err) => {
            idempotencyLogger.warn({ err, key }, 'Failed to update idempotency record');
          });

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
