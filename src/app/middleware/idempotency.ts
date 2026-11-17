import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { getPrismaClient } from "../../infrastructure/database";
import { ConflictError, ValidationError } from "../../shared/errors";
import { logger } from "../../infrastructure/logger";

export function idempotencyMiddleware(ttlHours = 24) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const header = req.get("Idempotency-Key");
    if (!header || !["POST", "PUT", "PATCH"].includes(req.method))
      return next();
    try {
      if (!/^[a-zA-Z0-9_-]{8,128}$/.test(header))
        throw new ValidationError("Invalid idempotency key");
      const db = getPrismaClient();
      const key = crypto
        .createHash("sha256")
        .update(`${req.user?.sub || "guest"}:${req.baseUrl}:${header}`)
        .digest("hex");
      const requestHash = crypto
        .createHash("sha256")
        .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`)
        .digest("hex");
      const now = new Date();
      let existing = await db.idempotencyRecord.findUnique({ where: { key } });
      if (existing && existing.requestHash !== requestHash)
        throw new ConflictError("Idempotency key was used for another request");
      if (
        existing &&
        existing.status === "RESOLVED" &&
        existing.expiresAt > now
      ) {
        res.status(existing.responseCode || 200).json(existing.responseBody);
        return;
      }
      const lease = new Date(Date.now() + 120000);
      if (existing) {
        if (existing.status === "PROCESSING" && existing.expiresAt > now)
          throw new ConflictError(
            "Request is still processing. Check its status before retrying.",
          );
        const claim = await db.idempotencyRecord.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: { status: "PROCESSING", expiresAt: lease },
        });
        if (!claim.count)
          throw new ConflictError("Request is already being processed");
      } else {
        try {
          existing = await db.idempotencyRecord.create({
            data: {
              key,
              userId: req.user?.sub,
              method: req.method,
              path: req.originalUrl,
              requestHash,
              status: "PROCESSING",
              expiresAt: lease,
            },
          });
        } catch (err) {
          if ((err as { code?: string }).code === "P2002")
            throw new ConflictError("Request is already being processed");
          throw err;
        }
      }
      const original = res.json.bind(res);
      res.json = (body: unknown) => {
        void db.idempotencyRecord
          .updateMany({
            where: { key, expiresAt: lease },
            data: {
              status: res.statusCode >= 500 ? "FAILED" : "RESOLVED",
              responseCode: res.statusCode,
              responseBody: body as any,
              expiresAt: new Date(Date.now() + ttlHours * 3600000),
            },
          })
          .catch((err) =>
            logger.warn(
              { err },
              "Could not cache idempotent response; domain state remains authoritative",
            ),
          );
        return original(body);
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
