"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isDevelopment = exports.isProduction = exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file from project root
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
// ---------------------------------------------------------------------------
// Environment schema — validated at startup; crash fast on invalid config
// ---------------------------------------------------------------------------
const envSchema = zod_1.z.object({
    // Application
    NODE_ENV: zod_1.z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    HOST: zod_1.z.string().default('0.0.0.0'),
    API_VERSION: zod_1.z.string().default('v1'),
    APP_NAME: zod_1.z.string().default('aibus-backend'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    // CORS
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:3000'),
    // JWT
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRY: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRY: zod_1.z.string().default('7d'),
    JWT_ISSUER: zod_1.z.string().default('aibus'),
    // Database — Supabase PostgreSQL
    DATABASE_URL: zod_1.z.string().url(),
    DATABASE_POOL_MIN: zod_1.z.coerce.number().int().nonnegative().default(2),
    DATABASE_POOL_MAX: zod_1.z.coerce.number().int().positive().default(10),
    // Redis
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_TLS: zod_1.z.coerce.boolean().default(false),
    REDIS_KEY_PREFIX: zod_1.z.string().default('aibus:'),
    // BullMQ
    BULL_PREFIX: zod_1.z.string().default('bull'),
    // GDS Provider
    GDS_PARTNER_BASE_URL: zod_1.z.string().url().default('https://partnerapi.iamgds.com'),
    GDS_TRANSACTION_BASE_URL: zod_1.z.string().url().default('https://partnertranapi.iamgds.com'),
    GDS_CLIENT_ID: zod_1.z.coerce.number().int().positive(),
    GDS_CLIENT_SECRET: zod_1.z.string().min(1),
    GDS_REQUEST_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(15000),
    GDS_CONNECT_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(5000),
    // PhonePe Payment Gateway
    PHONEPE_MERCHANT_ID: zod_1.z.string().optional(),
    PHONEPE_CLIENT_ID: zod_1.z.string().optional(),
    PHONEPE_CLIENT_SECRET: zod_1.z.string().optional(),
    PHONEPE_CLIENT_VERSION: zod_1.z.coerce.number().int().optional(),
    PHONEPE_ENVIRONMENT: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    PHONEPE_CALLBACK_URL: zod_1.z.string().url().optional(),
    PHONEPE_REDIRECT_URL: zod_1.z.string().url().optional(),
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(60000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().int().positive().default(900000), // 15 min
    AUTH_RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce.number().int().positive().default(10),
    // Security
    BCRYPT_ROUNDS: zod_1.z.coerce.number().int().min(10).max(14).default(12),
    REQUEST_BODY_LIMIT: zod_1.z.string().default('1mb'),
    // Seat Hold
    SEAT_HOLD_TTL_SECONDS: zod_1.z.coerce.number().int().positive().default(600), // 10 minutes
    SEAT_LOCK_TTL_SECONDS: zod_1.z.coerce.number().int().positive().default(30),
    // Graceful Shutdown
    SHUTDOWN_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(15000),
});
// ---------------------------------------------------------------------------
// Parse and validate — will throw at startup if config is invalid
// ---------------------------------------------------------------------------
function loadEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const formatted = result.error.format();
        console.error('❌ Invalid environment configuration:');
        console.error(JSON.stringify(formatted, null, 2));
        process.exit(1);
    }
    return result.data;
}
exports.env = loadEnv();
// ---------------------------------------------------------------------------
// Derived configuration helpers
// ---------------------------------------------------------------------------
exports.isProduction = exports.env.NODE_ENV === 'production';
exports.isDevelopment = exports.env.NODE_ENV === 'development';
exports.isTest = exports.env.NODE_ENV === 'test';
//# sourceMappingURL=env.js.map