import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Environment schema — validated at startup; crash fast on invalid config
// ---------------------------------------------------------------------------
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  API_VERSION: z.string().default('v1'),
  APP_NAME: z.string().default('aibus-backend'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_ISSUER: z.string().default('aibus'),

  // Database — Supabase PostgreSQL
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.preprocess(
    (value) => (typeof value === 'string' ? value.toLowerCase() : value),
    z.enum(['true', 'false']).default('false').transform((value) => value === 'true')
  ),
  REDIS_KEY_PREFIX: z.string().default('aibus:'),

  // BullMQ
  BULL_PREFIX: z.string().default('bull'),

  // GDS Provider
  GDS_PARTNER_BASE_URL: z.string().url().default('https://partnerapi.iamgds.com'),
  GDS_TRANSACTION_BASE_URL: z.string().url().default('https://partnertranapi.iamgds.com'),
  GDS_CLIENT_ID: z.coerce.number().int().positive(),
  GDS_CLIENT_SECRET: z.string().min(1),
  GDS_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  GDS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // PhonePe Payment Gateway
  PHONEPE_MERCHANT_ID: z.string().optional(),
  PHONEPE_CLIENT_ID: z.string().optional(),
  PHONEPE_CLIENT_SECRET: z.string().optional(),
  PHONEPE_CLIENT_VERSION: z.coerce.number().int().optional(),
  PHONEPE_ENVIRONMENT: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  PHONEPE_CALLBACK_URL: z.string().url().optional(),
  PHONEPE_REDIRECT_URL: z.string().url().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 min
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(10),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  REQUEST_BODY_LIMIT: z.string().default('1mb'),

  // Seat Hold
  SEAT_HOLD_TTL_SECONDS: z.coerce.number().int().positive().default(600), // 10 minutes
  SEAT_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(30),

  // Graceful Shutdown
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
});

export type Env = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Parse and validate — will throw at startup if config is invalid
// ---------------------------------------------------------------------------
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('❌ Invalid environment configuration:');
    console.error(JSON.stringify(formatted, null, 2));
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

// ---------------------------------------------------------------------------
// Derived configuration helpers
// ---------------------------------------------------------------------------
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
