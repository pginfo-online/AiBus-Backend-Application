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
    hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map