import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env, isTest } from '../../config/env';
import { getPrismaClient } from '../../infrastructure/database';
import { getRedisClient, isRedisAvailable } from '../../infrastructure/redis';
import { dreamzSmsProvider } from '../../providers/sms';
import {
  AppError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import { RegisterInput, LoginInput, SendOtpInput, VerifyOtpInput } from './auth.validation';
import { UserRole, UserStatus } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

interface StoredOtpData {
  hash: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async register(input: RegisterInput): Promise<{ user: any; tokens: AuthTokens }> {
    const prisma = getPrismaClient();

    // 1. Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

    // 3. Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
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

  public async login(input: LoginInput, deviceInfo?: string, ipAddress?: string): Promise<{ user: any; tokens: AuthTokens }> {
    const prisma = getPrismaClient();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('Your account is suspended or inactive');
    }

    // 2. Verify password
    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthenticationError('Invalid email or password');
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

  public async refreshTokens(rawRefreshToken: string, deviceInfo?: string, ipAddress?: string): Promise<AuthTokens> {
    const prisma = getPrismaClient();

    // 1. Verify refresh token signature
    let decoded: any;
    try {
      decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    // 2. Lookup token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AuthenticationError('Refresh token not found');
    }

    // 3. Check for reuse attack: if token was already revoked, invalidate entire family!
    if (tokenRecord.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });
      throw new AuthenticationError('Suspicious activity detected: Refresh token reuse. Please log in again.');
    }

    // 4. Check if token has expired
    if (new Date() > tokenRecord.expiresAt) {
      throw new AuthenticationError('Refresh token expired');
    }

    if (tokenRecord.user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('Account is not active');
    }

    // 5. Revoke the used refresh token (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // 6. Generate next token in the same token family
    return this.generateTokenPair(tokenRecord.userId, tokenRecord.user.role, tokenRecord.familyId, deviceInfo, ipAddress);
  }

  public async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const prisma = getPrismaClient();

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokenPair(
    userId: string,
    role: UserRole,
    familyId?: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<AuthTokens> {
    const prisma = getPrismaClient();
    const tokenFamily = familyId || uuidv4();
    const tokenId = uuidv4();

    // Access token (15 mins)
    const accessToken = jwt.sign(
      { sub: userId, role, tokenId },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY, issuer: env.JWT_ISSUER } as jwt.SignOptions
    );

    // Refresh token (7 days)
    const refreshToken = jwt.sign(
      { sub: userId, familyId: tokenFamily, tokenId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY, issuer: env.JWT_ISSUER } as jwt.SignOptions
    );

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

  private memoryOtpStore = new Map<string, StoredOtpData>();
  private memoryCooldownStore = new Map<string, number>();
  private memoryCountStore = new Map<string, { count: number; resetAt: number }>();

  private hashOtp(phone: string, otp: string): string {
    return crypto
      .createHmac('sha256', env.JWT_ACCESS_SECRET)
      .update(`${phone}:${otp}`)
      .digest('hex');
  }

  private verifyHash(expectedHash: string, providedHash: string): boolean {
    try {
      const a = Buffer.from(expectedHash, 'hex');
      const b = Buffer.from(providedHash, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private generateNumericOtp(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    return crypto.randomInt(min, max).toString();
  }

  private async getOtpRecord(phone: string): Promise<StoredOtpData | null> {
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const raw = await redis.get(`otp:${phone}`);
        if (!raw) return null;
        return JSON.parse(raw) as StoredOtpData;
      } catch {
        // Fallback to memory store if Redis query fails
      }
    }
    const mem = this.memoryOtpStore.get(phone);
    if (!mem) return null;
    if (Date.now() > mem.expiresAt) {
      this.memoryOtpStore.delete(phone);
      return null;
    }
    return mem;
  }

  private async saveOtpRecord(phone: string, record: StoredOtpData, ttlSeconds: number): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        await redis.set(`otp:${phone}`, JSON.stringify(record), 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback to memory store
      }
    }
    this.memoryOtpStore.set(phone, record);
  }

  private async deleteOtpRecord(phone: string): Promise<void> {
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        await redis.del(`otp:${phone}`);
      } catch {
        // Ignore error on delete
      }
    }
    this.memoryOtpStore.delete(phone);
  }

  private async incrementOtpAttempts(phone: string, currentRecord: StoredOtpData): Promise<number> {
    const updatedAttempts = currentRecord.attempts + 1;
    currentRecord.attempts = updatedAttempts;
    const ttlSeconds = Math.max(1, Math.floor((currentRecord.expiresAt - Date.now()) / 1000));
    await this.saveOtpRecord(phone, currentRecord, ttlSeconds);
    return updatedAttempts;
  }

  /**
   * Fast onboarding: Request OTP for a phone number
   */
  public async sendOtp(
    input: SendOtpInput,
    ipAddress?: string
  ): Promise<{
    phone: string;
    otpLength: number;
    expiresInSeconds: number;
    resendCooldownSeconds: number;
    debugOtp?: string;
  }> {
    const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);

    // 1. Check Resend Cooldown (e.g. 30 seconds)
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const inCooldown = await redis.get(`otp:cooldown:${cleanPhone}`);
        if (inCooldown) {
          const ttl = await redis.ttl(`otp:cooldown:${cleanPhone}`);
          throw new AppError({
            code: 'OTP_COOLDOWN',
            message: `Please wait ${ttl > 0 ? ttl : env.OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP`,
            statusCode: 429,
          });
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
      }
    } else {
      const cooldownUntil = this.memoryCooldownStore.get(cleanPhone);
      if (cooldownUntil && cooldownUntil > Date.now()) {
        const waitSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
        throw new AppError({
          code: 'OTP_COOLDOWN',
          message: `Please wait ${waitSec} seconds before requesting a new OTP`,
          statusCode: 429,
        });
      }
    }

    // 2. Rate limit: Max 5 OTP requests per hour per phone
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const hourlyKey = `otp:hourly:${cleanPhone}`;
        const count = await redis.incr(hourlyKey);
        if (count === 1) {
          await redis.expire(hourlyKey, 3600);
        } else if (count > 5) {
          throw new AppError({
            code: 'OTP_RATE_LIMIT_EXCEEDED',
            message: 'Maximum OTP requests reached for this hour. Please try again later.',
            statusCode: 429,
          });
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
      }
    } else {
      const now = Date.now();
      const current = this.memoryCountStore.get(cleanPhone);
      if (!current || now > current.resetAt) {
        this.memoryCountStore.set(cleanPhone, { count: 1, resetAt: now + 3600 * 1000 });
      } else {
        if (current.count >= 5) {
          throw new AppError({
            code: 'OTP_RATE_LIMIT_EXCEEDED',
            message: 'Maximum OTP requests reached for this hour. Please try again later.',
            statusCode: 429,
          });
        }
        current.count += 1;
      }
    }

    // 3. Generate Cryptographically Secure Numeric OTP
    const otp = this.generateNumericOtp(env.OTP_LENGTH);
    const hash = this.hashOtp(cleanPhone, otp);
    const now = Date.now();
    const expiresAt = now + env.OTP_EXPIRY_SECONDS * 1000;

    const record: StoredOtpData = {
      hash,
      attempts: 0,
      createdAt: now,
      expiresAt,
    };

    // 4. Save to Redis / Fallback Store
    await this.saveOtpRecord(cleanPhone, record, env.OTP_EXPIRY_SECONDS);

    // Set cooldown
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        await redis.set(`otp:cooldown:${cleanPhone}`, '1', 'EX', env.OTP_RESEND_COOLDOWN_SECONDS);
      } catch {}
    } else {
      this.memoryCooldownStore.set(cleanPhone, now + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);
    }

    // 5. Dispatch SMS via Dreamz Provider
    await dreamzSmsProvider.sendOtp({
      to: cleanPhone,
      otp,
      appHash: input.appHash,
    });

    return {
      phone: cleanPhone,
      otpLength: env.OTP_LENGTH,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      ...(isTest || env.SMS_SIMULATE ? { debugOtp: otp } : {}),
    };
  }

  /**
   * Fast onboarding: Verify OTP and log in / auto-register user
   */
  public async verifyOtp(
    input: VerifyOtpInput,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<{ user: any; tokens: AuthTokens; isNewUser: boolean }> {
    const cleanPhone = input.phone.replace(/\D/g, '').slice(-10);

    // 1. Fetch OTP record
    const record = await this.getOtpRecord(cleanPhone);
    if (!record || Date.now() > record.expiresAt) {
      throw new AuthenticationError('OTP has expired or was not requested. Please request a new OTP.');
    }

    // 2. Check maximum verification attempts (max 5)
    if (record.attempts >= 5) {
      await this.deleteOtpRecord(cleanPhone);
      throw new AuthenticationError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // 3. Verify OTP hash
    const computedHash = this.hashOtp(cleanPhone, input.otp.trim());
    const isValid = this.verifyHash(record.hash, computedHash);

    if (!isValid) {
      const updatedAttempts = await this.incrementOtpAttempts(cleanPhone, record);
      const remaining = Math.max(0, 5 - updatedAttempts);
      throw new AuthenticationError(
        `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      );
    }

    // 4. Invalidate OTP immediately upon successful verification
    await this.deleteOtpRecord(cleanPhone);

    const prisma = getPrismaClient();

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
            status: UserStatus.ACTIVE,
          },
        });
      } else {
        isNewUser = true;
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, env.BCRYPT_ROUNDS);

        user = await prisma.user.create({
          data: {
            email: syntheticEmail,
            passwordHash,
            firstName: input.firstName || 'Traveler',
            lastName: input.lastName || cleanPhone.slice(-4),
            phone: cleanPhone,
            phoneVerified: true,
            role: UserRole.CUSTOMER,
            status: UserStatus.ACTIVE,
          },
        });
      }
    } else {
      if (user.status !== UserStatus.ACTIVE) {
        throw new AuthenticationError('Your account is suspended or inactive');
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
