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
    DATABASE_URL: zod_1.z
        .string()
        .min(1)
        .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), { message: 'DATABASE_URL must be a valid PostgreSQL connection URL starting with postgres:// or postgresql://' }),
    DATABASE_POOL_MIN: zod_1.z.coerce.number().int().nonnegative().default(2),
    DATABASE_POOL_MAX: zod_1.z.coerce.number().int().positive().default(10),
    // Redis
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    REDIS_PASSWORD: zod_1.z.string().optional(),
    REDIS_TLS: zod_1.z.preprocess((value) => {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'string')
            return value.toLowerCase() === 'true';
        return false;
    }, zod_1.z.boolean().default(false)),
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
    PHONEPE_CLIENT_VERSION: zod_1.z.string().optional().default('1'),
    PHONEPE_ENVIRONMENT: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    PHONEPE_CALLBACK_URL: zod_1.z.string().optional(),
    PHONEPE_REDIRECT_URL: zod_1.z.string().optional(),
    // Razorpay Payment Gateway
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Payment Orchestration & Smart Routing Defaults
    PAYMENT_PRIMARY_GATEWAY: zod_1.z.enum(['RAZORPAY', 'PHONEPE', 'AUTO']).default('RAZORPAY'),
    PAYMENT_HOLD_CUTOFF_SECONDS: zod_1.z.coerce.number().int().positive().default(90), // 90s cutoff before hold expiry
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: zod_1.z.string().optional(),
    CLOUDINARY_API_KEY: zod_1.z.string().optional(),
    CLOUDINARY_API_SECRET: zod_1.z.string().optional(),
    // SMS Gateway (Dreamz Technology DLT)
    SMS_GATEWAY_URL: zod_1.z.string().url().default('http://trans.dreamztechnolgy.org/smsstatuswithid.aspx'),
    SMS_GATEWAY_MOBILE: zod_1.z.string().default('9923400506'),
    SMS_GATEWAY_PASSWORD: zod_1.z.string().default('WorknAi@2'),
    SMS_GATEWAY_APIKEY: zod_1.z.string().default('76bda706af0d42b5a7ea8a615567ad4f'),
    SMS_GATEWAY_PEID: zod_1.z.string().default('1701176380063580392'),
    SMS_GATEWAY_TEMPLATE_ID: zod_1.z.string().default('1777179197804384361'),
    SMS_GATEWAY_SENDER_ID: zod_1.z.string().default('PGINF'),
    SMS_DEFAULT_APP_HASH: zod_1.z.string().default('AbCdEfGhIjK'),
    OTP_EXPIRY_SECONDS: zod_1.z.coerce.number().int().positive().default(300), // 5 minutes
    OTP_RESEND_COOLDOWN_SECONDS: zod_1.z.coerce.number().int().positive().default(30),
    OTP_LENGTH: zod_1.z.coerce.number().int().min(4).max(6).default(6),
    SMS_SIMULATE: zod_1.z.preprocess((val) => {
        if (typeof val === 'boolean')
            return val;
        if (typeof val === 'string')
            return val.toLowerCase() === 'true';
        return false;
    }, zod_1.z.boolean().default(false)),
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