"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
function idempotencyMiddleware(ttlHours = 24) {
    return async (req, res, next) => {
        const header = req.get("Idempotency-Key");
        if (!header || !["POST", "PUT", "PATCH"].includes(req.method))
            return next();
        try {
            if (!/^[a-zA-Z0-9_-]{8,128}$/.test(header))
                throw new errors_1.ValidationError("Invalid idempotency key");
            const db = (0, database_1.getPrismaClient)();
            const key = node_crypto_1.default
                .createHash("sha256")
                .update(`${req.user?.sub || "guest"}:${req.baseUrl}:${header}`)
                .digest("hex");
            const requestHash = node_crypto_1.default
                .createHash("sha256")
                .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`)
                .digest("hex");
            const now = new Date();
            let existing = await db.idempotencyRecord.findUnique({ where: { key } });
            if (existing && existing.requestHash !== requestHash)
                throw new errors_1.ConflictError("Idempotency key was used for another request");
            if (existing &&
                existing.status === "RESOLVED" &&
                existing.expiresAt > now) {
                res.status(existing.responseCode || 200).json(existing.responseBody);
                return;
            }
            const lease = new Date(Date.now() + 120000);
            if (existing) {
                if (existing.status === "PROCESSING" && existing.expiresAt > now)
                    throw new errors_1.ConflictError("Request is still processing. Check its status before retrying.");
                const claim = await db.idempotencyRecord.updateMany({
                    where: { id: existing.id, updatedAt: existing.updatedAt },
                    data: { status: "PROCESSING", expiresAt: lease },
                });
                if (!claim.count)
                    throw new errors_1.ConflictError("Request is already being processed");
            }
            else {
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
                }
                catch (err) {
                    if (err.code === "P2002")
                        throw new errors_1.ConflictError("Request is already being processed");
                    throw err;
                }
            }
            const original = res.json.bind(res);
            res.json = (body) => {
                void db.idempotencyRecord
                    .updateMany({
                    where: { key, expiresAt: lease },
                    data: {
                        status: res.statusCode >= 500 ? "FAILED" : "RESOLVED",
                        responseCode: res.statusCode,
                        responseBody: body,
                        expiresAt: new Date(Date.now() + ttlHours * 3600000),
                    },
                })
                    .catch((err) => logger_1.logger.warn({ err }, "Could not cache idempotent response; domain state remains authoritative"));
                return original(body);
            };
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=idempotency.js.map