"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const client_1 = require("@prisma/client");
const logger_1 = require("../../infrastructure/logger");
const idempotencyLogger = logger_1.logger.child({ module: 'idempotency' });
/**
 * Idempotency middleware guaranteeing exactly-once semantics for mutations.
 * Reads 'Idempotency-Key' header, records request hash, and replays cached responses.
 */
function idempotencyMiddleware(ttlHours = 24) {
    return async (req, res, next) => {
        const key = req.headers['idempotency-key'];
        // Only apply if client sends Idempotency-Key on mutation methods
        if (!key || (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH')) {
            return next();
        }
        const prisma = (0, database_1.getPrismaClient)();
        const userId = req.user?.sub;
        const requestPayload = JSON.stringify(req.body || {});
        const requestHash = crypto_1.default.createHash('sha256').update(`${req.method}:${req.path}:${requestPayload}`).digest('hex');
        try {
            const existing = await prisma.idempotencyRecord.findUnique({
                where: { key },
            });
            if (existing) {
                if (existing.status === client_1.IdempotencyStatus.PROCESSING) {
                    throw new errors_1.ConflictError('A request with this Idempotency-Key is currently being processed. Please retry later.');
                }
                if (existing.status === client_1.IdempotencyStatus.RESOLVED && existing.responseCode) {
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
                    status: client_1.IdempotencyStatus.PROCESSING,
                    expiresAt,
                },
                update: {
                    status: client_1.IdempotencyStatus.PROCESSING,
                    requestHash,
                },
            });
            // Intercept res.json to capture response
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // Asynchronously update idempotency record
                prisma.idempotencyRecord
                    .update({
                    where: { key },
                    data: {
                        status: client_1.IdempotencyStatus.RESOLVED,
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
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=idempotency.js.map