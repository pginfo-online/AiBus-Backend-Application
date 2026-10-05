import pino from 'pino';
import { env, isProduction, isDevelopment } from '../../config/env';

// ---------------------------------------------------------------------------
// Pino logger — structured JSON in production, pretty in development
// ---------------------------------------------------------------------------

const loggerOptions: pino.LoggerOptions = {
  name: env.APP_NAME,
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,

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
    service: env.APP_NAME,
    env: env.NODE_ENV,
  },

  // Serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
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
const transport = isDevelopment
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

export const logger = pino({
  ...loggerOptions,
  ...transport,
});

/**
 * Create a child logger with contextual bindings.
 * Use for per-request or per-module logging.
 */
export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}

export type Logger = pino.Logger;
