"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const database_1 = require("../../infrastructure/database");
const redis_1 = require("../../infrastructure/redis");
const sms_1 = require("../../providers/sms");
const errors_1 = require("../../shared/errors");
const client_1 = require("@prisma/client");
class AuthService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    async register(input) {
        const prisma = (0, database_1.getPrismaClient)();
        // 1. Check if email already registered
        const existing = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existing) {
            throw new errors_1.ConflictError('An account with this email already exists');
        }
        // 2. Hash password
        const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.BCRYPT_ROUNDS);
        // 3. Create user
        const user = await prisma.user.create({
            data: {
                email: input.email,
                passwordHash,
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.phone,
                role: client_1.UserRole.CUSTOMER,
                status: client_1.UserStatus.ACTIVE,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                status: true,
                walletBalance: true,
                createdAt: true,
            },
        });
        // 4. Generate tokens
        const tokens = await this.generateTokenPair(user.id, user.role);
        return { user, tokens };
    }
    async login(input, deviceInfo, ipAddress) {
        const prisma = (0, database_1.getPrismaClient)();
        // 1. Find user by email
        const user = await prisma.user.findUnique({
            where: { email: input.email },
        });
        if (!user) {
            throw new errors_1.AuthenticationError('Invalid email or password');
        }
        if (user.status !== client_1.UserStatus.ACTIVE) {
            throw new errors_1.AuthenticationError('Your account is suspended or inactive');
        }
        // 2. Verify password
        const passwordValid = await bcryptjs_1.default.compare(input.password, user.passwordHash);
        if (!passwordValid) {
            throw new errors_1.AuthenticationError('Invalid email or password');
        }
        // 3. Issue token pair
        const tokens = await this.generateTokenPair(user.id, user.role, undefined, deviceInfo, ipAddress);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                role: user.role,
                status: user.status,
                walletBalance: user.walletBalance,
                createdAt: user.createdAt,
            },
            tokens,
        };
    }
    async refreshTokens(rawRefreshToken, deviceInfo, ipAddress) {
        const prisma = (0, database_1.getPrismaClient)();
        // 1. Verify refresh token signature
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(rawRefreshToken, env_1.env.JWT_REFRESH_SECRET);
        }
        catch {
            throw new errors_1.AuthenticationError('Invalid or expired refresh token');
        }
        const tokenHash = this.hashToken(rawRefreshToken);
        // 2. Lookup token in database
        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!tokenRecord) {
            throw new errors_1.AuthenticationError('Refresh token not found');
        }
        // 3. Check for reuse attack: if token was already revoked, invalidate entire family!
        if (tokenRecord.revokedAt) {
            await prisma.refreshToken.updateMany({
                where: { familyId: tokenRecord.familyId },
                data: { revokedAt: new Date() },
            });
            throw new errors_1.AuthenticationError('Suspicious activity detected: Refresh token reuse. Please log in again.');
        }
        // 4. Check if token has expired
        if (new Date() > tokenRecord.expiresAt) {
            throw new errors_1.AuthenticationError('Refresh token expired');
        }
        if (tokenRecord.user.status !== client_1.UserStatus.ACTIVE) {
            throw new errors_1.AuthenticationError('Account is not active');
        }
        // 5. Revoke the used refresh token (Token Rotation)
        await prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revokedAt: new Date() },
        });
        // 6. Generate next token in the same token family
        return this.generateTokenPair(tokenRecord.userId, tokenRecord.user.role, tokenRecord.familyId, deviceInfo, ipAddress);
    }
    async logout(rawRefreshToken) {
        const tokenHash = this.hashToken(rawRefreshToken);
        const prisma = (0, database_1.getPrismaClient)();
        await prisma.refreshToken.updateMany({
            where: { tokenHash },
            data: { revokedAt: new Date() },
        });
    }
    async generateTokenPair(userId, role, familyId, deviceInfo, ipAddress) {
        const prisma = (0, database_1.getPrismaClient)();
        const tokenFamily = familyId || (0, uuid_1.v4)();
        const tokenId = (0, uuid_1.v4)();
        // Access token (15 mins)
        const accessToken = jsonwebtoken_1.default.sign({ sub: userId, role, tokenId }, env_1.env.JWT_ACCESS_SECRET, { expiresIn: env_1.env.JWT_ACCESS_EXPIRY, issuer: env_1.env.JWT_ISSUER });
        // Refresh token (7 days)
        const refreshToken = jsonwebtoken_1.default.sign({ sub: userId, familyId: tokenFamily, tokenId }, env_1.env.JWT_REFRESH_SECRET, { expiresIn: env_1.env.JWT_REFRESH_EXPIRY, issuer: env_1.env.JWT_ISSUER });
        const tokenHash = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        // Persist refresh token
        await prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                familyId: tokenFamily,
                expiresAt,
                deviceInfo,
                ipAddress,
            },
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: 15 * 60, // 15 mins in seconds
        };
    }
    memoryOtpStore = new Map();
    memoryCooldownStore = new Map();
    memoryCountStore = new Map();
    hashOtp(phone, otp) {
        return crypto_1.default
            .createHmac('sha256', env_1.env.JWT_ACCESS_SECRET)
            .update(`${phone}:${otp}`)
            .digest('hex');
    }
    verifyHash(expectedHash, providedHash) {
        try {
            const a = Buffer.from(expectedHash, 'hex');
            const b = Buffer.from(providedHash, 'hex');
            if (a.length !== b.length)
                return false;
            return crypto_1.default.timingSafeEqual(a, b);
        }
        catch {
            return false;
        }
    }
    generateNumericOtp(length) {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length);
        return crypto_1.default.randomInt(min, max).toString();
    }
    async getOtpRecord(phone) {
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                const raw = await redis.get(`otp:${phone}`);
                if (!raw)
                    return null;
                return JSON.parse(raw);
            }
            catch {
                // Fallback to memory store if Redis query fails
            }
        }
        const mem = this.memoryOtpStore.get(phone);
        if (!mem)
            return null;
        if (Date.now() > mem.expiresAt) {
            this.memoryOtpStore.delete(phone);
            return null;
        }
        return mem;
    }
    async saveOtpRecord(phone, record, ttlSeconds) {
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                await redis.set(`otp:${phone}`, JSON.stringify(record), 'EX', ttlSeconds);
                return;
            }
            catch {
                // Fallback to memory store
            }
        }
        this.memoryOtpStore.set(phone, record);
    }
    async deleteOtpRecord(phone) {
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                await redis.del(`otp:${phone}`);
            }
            catch {
                // Ignore error on delete
            }
        }
        this.memoryOtpStore.delete(phone);
    }
    async incrementOtpAttempts(phone, currentRecord) {
        const updatedAttempts = currentRecord.attempts + 1;
        currentRecord.attempts = updatedAttempts;
        const ttlSeconds = Math.max(1, Math.floor((currentRecord.expiresAt - Date.now()) / 1000));
        await this.saveOtpRecord(phone, currentRecord, ttlSeconds);
        return updatedAttempts;
    }
    /**
     * Fast onboarding: Request OTP for a phone number
     */
    async sendOtp(input, ipAddress) {
        const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);
        // 1. Check Resend Cooldown (e.g. 30 seconds)
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                const inCooldown = await redis.get(`otp:cooldown:${cleanPhone}`);
                if (inCooldown) {
                    const ttl = await redis.ttl(`otp:cooldown:${cleanPhone}`);
                    throw new errors_1.AppError({
                        code: 'OTP_COOLDOWN',
                        message: `Please wait ${ttl > 0 ? ttl : env_1.env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP`,
                        statusCode: 429,
                    });
                }
            }
            catch (err) {
                if (err instanceof errors_1.AppError)
                    throw err;
            }
        }
        else {
            const cooldownUntil = this.memoryCooldownStore.get(cleanPhone);
            if (cooldownUntil && cooldownUntil > Date.now()) {
                const waitSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
                throw new errors_1.AppError({
                    code: 'OTP_COOLDOWN',
                    message: `Please wait ${waitSec} seconds before requesting a new OTP`,
                    statusCode: 429,
                });
            }
        }
        // 2. Rate limit: Max 5 OTP requests per hour per phone
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                const hourlyKey = `otp:hourly:${cleanPhone}`;
                const count = await redis.incr(hourlyKey);
                if (count === 1) {
                    await redis.expire(hourlyKey, 3600);
                }
                else if (count > 5) {
                    throw new errors_1.AppError({
                        code: 'OTP_RATE_LIMIT_EXCEEDED',
                        message: 'Maximum OTP requests reached for this hour. Please try again later.',
                        statusCode: 429,
                    });
                }
            }
            catch (err) {
                if (err instanceof errors_1.AppError)
                    throw err;
            }
        }
        else {
            const now = Date.now();
            const current = this.memoryCountStore.get(cleanPhone);
            if (!current || now > current.resetAt) {
                this.memoryCountStore.set(cleanPhone, { count: 1, resetAt: now + 3600 * 1000 });
            }
            else {
                if (current.count >= 5) {
                    throw new errors_1.AppError({
                        code: 'OTP_RATE_LIMIT_EXCEEDED',
                        message: 'Maximum OTP requests reached for this hour. Please try again later.',
                        statusCode: 429,
                    });
                }
                current.count += 1;
            }
        }
        // 3. Generate Cryptographically Secure Numeric OTP
        const otp = this.generateNumericOtp(env_1.env.OTP_LENGTH);
        const hash = this.hashOtp(cleanPhone, otp);
        const now = Date.now();
        const expiresAt = now + env_1.env.OTP_EXPIRY_SECONDS * 1000;
        const record = {
            hash,
            attempts: 0,
            createdAt: now,
            expiresAt,
        };
        // 4. Save to Redis / Fallback Store
        await this.saveOtpRecord(cleanPhone, record, env_1.env.OTP_EXPIRY_SECONDS);
        // Set cooldown
        if ((0, redis_1.isRedisAvailable)()) {
            try {
                const redis = (0, redis_1.getRedisClient)();
                await redis.set(`otp:cooldown:${cleanPhone}`, '1', 'EX', env_1.env.OTP_RESEND_COOLDOWN_SECONDS);
            }
            catch { }
        }
        else {
            this.memoryCooldownStore.set(cleanPhone, now + env_1.env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
        }
        // 5. Dispatch SMS via Dreamz Provider
        await sms_1.dreamzSmsProvider.sendOtp({
            to: cleanPhone,
            otp,
            appHash: input.appHash,
        });
        return {
            phone: cleanPhone,
            otpLength: env_1.env.OTP_LENGTH,
            expiresInSeconds: env_1.env.OTP_EXPIRY_SECONDS,
            resendCooldownSeconds: env_1.env.OTP_RESEND_COOLDOWN_SECONDS,
            ...(env_1.isTest || env_1.env.SMS_SIMULATE ? { debugOtp: otp } : {}),
        };
    }
    /**
     * Fast onboarding: Verify OTP and log in / auto-register user
     */
    async verifyOtp(input, deviceInfo, ipAddress) {
        const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);
        // 1. Fetch OTP record
        const record = await this.getOtpRecord(cleanPhone);
        if (!record || Date.now() > record.expiresAt) {
            throw new errors_1.AuthenticationError('OTP has expired or was not requested. Please request a new OTP.');
        }
        // 2. Check maximum verification attempts (max 5)
        if (record.attempts >= 5) {
            await this.deleteOtpRecord(cleanPhone);
            throw new errors_1.AuthenticationError('Maximum verification attempts exceeded. Please request a new OTP.');
        }
        // 3. Verify OTP hash
        const computedHash = this.hashOtp(cleanPhone, input.otp.trim());
        const isValid = this.verifyHash(record.hash, computedHash);
        if (!isValid) {
            const updatedAttempts = await this.incrementOtpAttempts(cleanPhone, record);
            const remaining = Math.max(0, 5 - updatedAttempts);
            throw new errors_1.AuthenticationError(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        }
        // 4. Invalidate OTP immediately upon successful verification
        await this.deleteOtpRecord(cleanPhone);
        const prisma = (0, database_1.getPrismaClient)();
        // 5. Lookup user by phone
        let user = await prisma.user.findFirst({
            where: { phone: cleanPhone },
        });
        let isNewUser = false;
        if (!user) {
            // Check if synthetic phone email already exists
            const syntheticEmail = `${cleanPhone}@mobile.aibus.app`;
            const existingEmailUser = await prisma.user.findUnique({
                where: { email: syntheticEmail },
            });
            if (existingEmailUser) {
                user = await prisma.user.update({
                    where: { id: existingEmailUser.id },
                    data: {
                        phone: cleanPhone,
                        phoneVerified: true,
                        status: client_1.UserStatus.ACTIVE,
                    },
                });
            }
            else {
                isNewUser = true;
                const randomPassword = crypto_1.default.randomBytes(32).toString('hex');
                const passwordHash = await bcryptjs_1.default.hash(randomPassword, env_1.env.BCRYPT_ROUNDS);
                user = await prisma.user.create({
                    data: {
                        email: syntheticEmail,
                        passwordHash,
                        firstName: input.firstName || 'Traveler',
                        lastName: input.lastName || cleanPhone.slice(-4),
                        phone: cleanPhone,
                        phoneVerified: true,
                        role: client_1.UserRole.CUSTOMER,
                        status: client_1.UserStatus.ACTIVE,
                    },
                });
            }
        }
        else {
            if (user.status !== client_1.UserStatus.ACTIVE) {
                throw new errors_1.AuthenticationError('Your account is suspended or inactive');
            }
            if (!user.phoneVerified) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { phoneVerified: true },
                });
            }
        }
        // 6. Generate session JWT token pair
        const tokens = await this.generateTokenPair(user.id, user.role, undefined, deviceInfo, ipAddress);
        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                role: user.role,
                status: user.status,
                walletBalance: user.walletBalance,
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                createdAt: user.createdAt,
            },
            tokens,
            isNewUser,
        };
    }
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map