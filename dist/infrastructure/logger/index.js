"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.createChildLogger = createChildLogger;
const pino_1 = __importDefault(require("pino"));
const env_1 = require("../../config/env");
// ---------------------------------------------------------------------------
// Pino logger — structured JSON in production, pretty in development
// ---------------------------------------------------------------------------
const loggerOptions = {
    name: env_1.env.APP_NAME,
    level: env_1.env.LOG_LEVEL,
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    // Redact sensitive data from logs
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-refresh-token"]',
            'password',
            'passwordHash',
            'token',
            'refreshToken',
            'accessToken',
            'clientSecret',
            'GDS_CLIENT_SECRET',
            'JWT_ACCESS_SECRET',
            'JWT_REFRESH_SECRET',
            'PHONEPE_CLIENT_SECRET',
            'CLOUDINARY_API_SECRET',
            'creditCard',
            'cvv',
            'cardNumber',
        ],
        censor: '[REDACTED]',
    },
    // Standard fields
    base: {
        service: env_1.env.APP_NAME,
        env: env_1.env.NODE_ENV,
    },
    // Serializers for common objects
    serializers: {
        err: pino_1.default.stdSerializers.err,
        req: (req) => ({
            method: req.method,
            url: req.url,
            requestId: req.id,
            remoteAddress: req.remoteAddress,
            userAgent: req.headers?.['user-agent'],
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
};
// Use pino-pretty transport in development
const transport = env_1.isDevelopment
    ? {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,service,env',
            },
        },
    }
    : {};
exports.logger = (0, pino_1.default)({
    ...loggerOptions,
    ...transport,
});
/**
 * Create a child logger with contextual bindings.
 * Use for per-request or per-module logging.
 */
function createChildLogger(bindings) {
    return exports.logger.child(bindings);
}
//# sourceMappingURL=index.js.map