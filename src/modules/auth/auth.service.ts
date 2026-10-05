import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { getPrismaClient } from '../../infrastructure/database';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import { RegisterInput, LoginInput } from './auth.validation';
import { UserRole, UserStatus } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
