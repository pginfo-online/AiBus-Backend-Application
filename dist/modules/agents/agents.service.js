"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const database_1 = require("../../infrastructure/database");
const logger_1 = require("../../infrastructure/logger");
const env_1 = require("../../config/env");
const errors_1 = require("../../shared/errors");
const client_1 = require("@prisma/client");
const ledger_1 = require("../../infrastructure/ledger");
const payments_1 = require("../../infrastructure/payments");
const auth_service_1 = require("../auth/auth.service");
const agentLogger = logger_1.logger.child({ module: 'agents-service' });
// ---------------------------------------------------------------------------
// PhonePe helpers (reuse pattern from PaymentsService)
// ---------------------------------------------------------------------------
const PHONEPE_CHECKOUT_BASE = env_1.env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/pg'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const PHONEPE_OAUTH_URL = env_1.env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
let _ppTokenCache = null;
async function getPhonePeToken() {
    if (_ppTokenCache && _ppTokenCache.expiresAt > Date.now() + 60000) {
        return _ppTokenCache.token;
    }
    if (env_1.isDevelopment || env_1.isTest)
        return `MOCK-OAUTH-${Date.now()}`;
    const params = new URLSearchParams({
        client_id: env_1.env.PHONEPE_CLIENT_ID || '',
        client_secret: env_1.env.PHONEPE_CLIENT_SECRET || '',
        client_version: env_1.env.PHONEPE_CLIENT_VERSION || '1',
        grant_type: 'client_credentials',
    });
    const res = await axios_1.default.post(PHONEPE_OAUTH_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
    });
    const expiresIn = Number(res.data.expires_in || 3600);
    _ppTokenCache = { token: res.data.access_token, expiresAt: Date.now() + expiresIn * 1000 };
    return _ppTokenCache.token;
}
// ---------------------------------------------------------------------------
// AgentsService
// ---------------------------------------------------------------------------
class AgentsService {
    static instance;
    authService;
    constructor() {
        this.authService = auth_service_1.AuthService.getInstance();
    }
    static getInstance() {
        if (!AgentsService.instance) {
            AgentsService.instance = new AgentsService();
        }
        return AgentsService.instance;
    }
    // --------------------------------------------------------------------------
    // 1. Register Agent + Create Owner User Account
    // --------------------------------------------------------------------------
    async registerAgent(input) {
        const prisma = (0, database_1.getPrismaClient)();
        // Check for duplicate agent email
        const existing = await prisma.agent.findUnique({ where: { email: input.email } });
        if (existing)
            throw new errors_1.ConflictError('An agent account with this email already exists');
        // Check for duplicate user email (agent owner user)
        const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
        if (existingUser)
            throw new errors_1.ConflictError('An account with this email already exists');
        const passwordHash = await bcryptjs_1.default.hash(input.password, env_1.env.BCRYPT_ROUNDS);
        const result = await prisma.$transaction(async (tx) => {
            // Create agent record
            const agent = await tx.agent.create({
                data: {
                    businessName: input.businessName,
                    contactPersonName: input.contactPersonName,
                    email: input.email,
                    phone: input.phone,
                    businessAddress: input.businessAddress,
                    city: input.city,
                    state: input.state,
                    pincode: input.pincode ?? null,
                    gstNumber: input.gstNumber ?? null,
                    panNumber: input.panNumber ?? null,
                    status: client_1.AgentStatus.PENDING_KYC,
                },
            });
            // Create owner user account with OPERATOR_AGENT role
            const user = await tx.user.create({
                data: {
                    email: input.email,
                    passwordHash,
                    firstName: input.contactPersonName.split(' ')[0] || input.contactPersonName,
                    lastName: input.contactPersonName.split(' ').slice(1).join(' ') || '',
                    phone: input.phone,
                    role: client_1.UserRole.OPERATOR_AGENT,
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            // Link as OWNER staff
            await tx.agentStaff.create({
                data: {
                    agentId: agent.id,
                    userId: user.id,
                    role: client_1.AgentStaffRole.OWNER,
                    isActive: true,
                    joinedAt: new Date(),
                },
            });
            // Create wallet with zero balance
            const wallet = await tx.agentWallet.create({
                data: {
                    agentId: agent.id,
                    cashBalance: 0,
                    creditLimit: 0,
                },
            });
            return { agent, user, wallet };
        });
        agentLogger.info({ agentId: result.agent.id, userId: result.user.id }, 'Agent registered — pending KYC');
        // Generate auth tokens for the new owner user
        const tokens = await this.authService.generateTokenPair(result.user.id, result.user.role);
        return {
            agent: this._safeAgent(result.agent),
            user: this._safeUser(result.user),
            tokens,
        };
    }
    // --------------------------------------------------------------------------
    // 2. Get Agent Profile (derived from userId via AgentStaff)
    // --------------------------------------------------------------------------
    async getAgentForUser(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const staff = await prisma.agentStaff.findFirst({
            where: { userId, isActive: true },
            include: { agent: { include: { wallet: true } } },
        });
        if (!staff)
            throw new errors_1.NotFoundError('No agent organization found for this user');
        return { ...this._safeAgent(staff.agent), wallet: this._safeWallet(staff.agent.wallet) };
    }
    async getAgentById(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: { wallet: true, kycDocuments: true, bankAccounts: true, staff: { include: { user: true } } },
        });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        return agent;
    }
    async updateProfile(agentId, input) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.update({
            where: { id: agentId },
            data: {
                businessName: input.businessName,
                contactPersonName: input.contactPersonName,
                phone: input.phone,
                businessAddress: input.businessAddress,
                city: input.city,
                state: input.state,
                pincode: input.pincode,
                gstNumber: input.gstNumber,
            },
        });
        return this._safeAgent(agent);
    }
    // --------------------------------------------------------------------------
    // 3. KYC — Document submission (after Cloudinary upload by controller)
    // --------------------------------------------------------------------------
    async submitKycDocument(agentId, docType, fileUrl, storageKey) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        if (agent.status !== client_1.AgentStatus.PENDING_KYC &&
            agent.status !== client_1.AgentStatus.KYC_SUBMITTED &&
            agent.status !== client_1.AgentStatus.REJECTED) {
            throw new errors_1.ValidationError(`Cannot submit KYC in status ${agent.status}`);
        }
        // Upsert document (allow re-upload of same doc type)
        const doc = await prisma.agentKycDocument.upsert({
            where: {
                agentId_docType: { agentId, docType },
            },
            create: {
                agentId,
                docType,
                fileUrl,
                storageKey,
            },
            update: {
                fileUrl,
                storageKey,
                verifiedAt: null,
                verifiedBy: null,
                rejectedAt: null,
                rejectReason: null,
            },
        });
        // Advance status to KYC_SUBMITTED if not already further along
        if (agent.status === client_1.AgentStatus.PENDING_KYC || agent.status === client_1.AgentStatus.REJECTED) {
            await prisma.agent.update({
                where: { id: agentId },
                data: { status: client_1.AgentStatus.KYC_SUBMITTED },
            });
        }
        agentLogger.info({ agentId, docType }, 'KYC document submitted');
        return doc;
    }
    async getKycStatus(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: { kycDocuments: true },
        });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        return {
            agentId: agent.id,
            status: agent.status,
            rejectionReason: agent.rejectionReason,
            approvedAt: agent.approvedAt,
            documents: agent.kycDocuments,
        };
    }
    // --------------------------------------------------------------------------
    // 4. Bank Accounts
    // --------------------------------------------------------------------------
    async addBankAccount(agentId, input) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        // If isPrimary, demote existing primary
        if (input.isPrimary) {
            await prisma.agentBankAccount.updateMany({
                where: { agentId, isPrimary: true },
                data: { isPrimary: false },
            });
        }
        const account = await prisma.agentBankAccount.create({
            data: {
                agentId,
                accountHolderName: input.accountHolderName,
                accountNumber: input.accountNumber,
                ifscCode: input.ifscCode,
                bankName: input.bankName,
                isPrimary: input.isPrimary ?? false,
                // Freeze withdrawals for 48h after adding new bank account
                withdrawFreezeUntil: new Date(Date.now() + 48 * 60 * 60 * 1000),
            },
        });
        return account;
    }
    async listBankAccounts(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        return prisma.agentBankAccount.findMany({ where: { agentId }, orderBy: { createdAt: 'asc' } });
    }
    // --------------------------------------------------------------------------
    // 5. Agent Staff Management
    // --------------------------------------------------------------------------
    async inviteStaff(agentId, input) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        if (agent.status !== client_1.AgentStatus.APPROVED) {
            throw new errors_1.ValidationError('Agent must be APPROVED to manage staff');
        }
        // Find or create user account for the staff member
        let user = await prisma.user.findUnique({ where: { email: input.email } });
        let isNewUser = false;
        if (!user) {
            // Create a placeholder user; they'll set their own password on first login
            const tempPassword = (0, uuid_1.v4)(); // Random; they'll reset via email
            const passwordHash = await bcryptjs_1.default.hash(tempPassword, env_1.env.BCRYPT_ROUNDS);
            user = await prisma.user.create({
                data: {
                    email: input.email,
                    passwordHash,
                    firstName: '',
                    lastName: '',
                    role: client_1.UserRole.OPERATOR_AGENT,
                    status: client_1.UserStatus.ACTIVE,
                },
            });
            isNewUser = true;
        }
        // Check if already a staff member
        const existing = await prisma.agentStaff.findUnique({
            where: { agentId_userId: { agentId, userId: user.id } },
        });
        if (existing && existing.isActive) {
            throw new errors_1.ConflictError('User is already a staff member of this agent organization');
        }
        const staff = await prisma.agentStaff.upsert({
            where: { agentId_userId: { agentId, userId: user.id } },
            create: {
                agentId,
                userId: user.id,
                role: input.role,
                permissions: input.permissions ? input.permissions : client_1.Prisma.JsonNull,
                isActive: true,
                invitedAt: new Date(),
            },
            update: {
                role: input.role,
                permissions: input.permissions ? input.permissions : client_1.Prisma.JsonNull,
                isActive: true,
                invitedAt: new Date(),
            },
        });
        agentLogger.info({ agentId, userId: user.id, role: input.role }, 'Staff invited');
        return { staff, user: this._safeUser(user), isNewUser };
    }
    async listStaff(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        return prisma.agentStaff.findMany({
            where: { agentId, isActive: true },
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true } } },
            orderBy: { invitedAt: 'asc' },
        });
    }
    async updateStaffRole(agentId, staffId, input) {
        const prisma = (0, database_1.getPrismaClient)();
        const staff = await prisma.agentStaff.findUnique({ where: { id: staffId } });
        if (!staff || staff.agentId !== agentId)
            throw new errors_1.NotFoundError('Staff member not found');
        if (staff.role === client_1.AgentStaffRole.OWNER)
            throw new errors_1.ValidationError('Cannot change the OWNER role');
        return prisma.agentStaff.update({
            where: { id: staffId },
            data: {
                role: input.role,
                permissions: input.permissions ? input.permissions : client_1.Prisma.JsonNull,
            },
        });
    }
    async removeStaff(agentId, staffId) {
        const prisma = (0, database_1.getPrismaClient)();
        const staff = await prisma.agentStaff.findUnique({ where: { id: staffId } });
        if (!staff || staff.agentId !== agentId)
            throw new errors_1.NotFoundError('Staff member not found');
        if (staff.role === client_1.AgentStaffRole.OWNER)
            throw new errors_1.ValidationError('Cannot remove the OWNER');
        return prisma.agentStaff.update({ where: { id: staffId }, data: { isActive: false } });
    }
    // --------------------------------------------------------------------------
    // 6. Wallet — Balance & Statement
    // --------------------------------------------------------------------------
    async getWallet(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        const wallet = await prisma.agentWallet.findUnique({ where: { agentId } });
        if (!wallet)
            throw new errors_1.NotFoundError('Wallet not found');
        return this._safeWallet(wallet);
    }
    async getWalletStatement(agentId, page = 1, limit = 50) {
        const prisma = (0, database_1.getPrismaClient)();
        const skip = (page - 1) * limit;
        const [entries, total] = await Promise.all([
            prisma.ledgerEntry.findMany({
                where: { agentId },
                orderBy: { postedAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.ledgerEntry.count({ where: { agentId } }),
        ]);
        return { entries, total, page, limit, pages: Math.ceil(total / limit) };
    }
    // --------------------------------------------------------------------------
    // 7. Wallet Top-up Initiation (PhonePe)
    // --------------------------------------------------------------------------
    async initiateTopup(agentId, input) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        if (agent.status !== client_1.AgentStatus.APPROVED) {
            throw new errors_1.ValidationError('Agent must be APPROVED to top up wallet');
        }
        // Idempotency check
        if (input.idempotencyKey) {
            const existing = await prisma.walletTopup.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
            if (existing)
                return { topup: existing, isIdempotent: true };
        }
        const redirectUrl = input.redirectUrl || env_1.env.PHONEPE_REDIRECT_URL || 'http://localhost:5173/wallet';
        const orchestrator = payments_1.PaymentOrchestrator.getInstance();
        const intentResult = await orchestrator.createPaymentIntentWithFallback({
            bookingId: agentId,
            bookingNumber: `TOPUP-${agentId.slice(0, 8).toUpperCase()}`,
            amount: input.amount,
            currency: 'INR',
            customerName: agent.businessName,
            customerEmail: agent.email,
            customerPhone: agent.phone,
            redirectUrl,
            isTopup: true,
        }, input.gateway || 'AUTO');
        const topup = await prisma.walletTopup.create({
            data: {
                agentId,
                amount: input.amount,
                status: client_1.TopupStatus.INITIATED,
                gateway: intentResult.gateway,
                merchantTxnId: intentResult.merchantTxnId,
                gatewayOrderId: intentResult.gatewayOrderId,
                idempotencyKey: input.idempotencyKey ?? null,
            },
        });
        agentLogger.info({ agentId, topupId: topup.id, amount: input.amount, gateway: intentResult.gateway }, 'Wallet top-up initiated via orchestrator');
        return {
            topup,
            gateway: intentResult.gateway,
            checkoutUrl: intentResult.paymentUrl,
            upiIntentUrl: intentResult.upiIntentUrl,
            sdkPayload: intentResult.sdkPayload,
            merchantTxnId: intentResult.merchantTxnId,
            isIdempotent: false,
        };
    }
    // --------------------------------------------------------------------------
    // 8. Wallet Top-up Confirmation (called from payment webhook)
    // --------------------------------------------------------------------------
    async confirmTopup(merchantTxnId, gatewayPaymentId) {
        const prisma = (0, database_1.getPrismaClient)();
        const topup = await prisma.walletTopup.findUnique({ where: { merchantTxnId } });
        if (!topup)
            throw new errors_1.NotFoundError(`Top-up not found: ${merchantTxnId}`);
        if (topup.status === client_1.TopupStatus.COMPLETED) {
            agentLogger.info({ merchantTxnId }, 'Top-up already confirmed (idempotent)');
            return topup;
        }
        const amount = Number(topup.amount);
        const idempotencyPrefix = `topup:${topup.id}`;
        await prisma.$transaction(async (tx) => {
            // Mark topup completed
            await tx.walletTopup.update({
                where: { id: topup.id },
                data: {
                    status: client_1.TopupStatus.COMPLETED,
                    gatewayPaymentId: gatewayPaymentId ?? null,
                    webhookVerified: true,
                    completedAt: new Date(),
                },
            });
            // Credit wallet — optimistic lock on version
            const wallet = await tx.agentWallet.findUnique({ where: { agentId: topup.agentId } });
            if (!wallet)
                throw new Error(`AgentWallet missing for agent ${topup.agentId}`);
            await tx.agentWallet.updateMany({
                where: { agentId: topup.agentId, version: wallet.version },
                data: {
                    cashBalance: { increment: amount },
                    totalTopups: { increment: amount },
                    version: { increment: 1 },
                },
            });
            // Post balanced ledger entries
            const lines = (0, ledger_1.buildTopupLines)({ topupId: topup.id, agentId: topup.agentId, amount, idempotencyPrefix });
            const ledgerData = (0, ledger_1.buildLedgerPostingData)({
                agentId: topup.agentId,
                topupId: topup.id,
                createdBy: 'SYSTEM',
                lines,
            });
            await tx.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });
        });
        agentLogger.info({ topupId: topup.id, agentId: topup.agentId, amount }, 'Wallet top-up confirmed and ledger posted');
        return prisma.walletTopup.findUnique({ where: { id: topup.id } });
    }
    // --------------------------------------------------------------------------
    // 9. Reports — Booking History & Commission Earnings
    // --------------------------------------------------------------------------
    async getBookingHistory(agentId, filters) {
        const prisma = (0, database_1.getPrismaClient)();
        const page = filters.page ?? 1;
        const limit = Math.min(filters.limit ?? 20, 100);
        const skip = (page - 1) * limit;
        const where = { agentId };
        if (filters.status)
            where.status = filters.status;
        if (filters.fromDate || filters.toDate) {
            where.createdAt = {};
            if (filters.fromDate)
                where.createdAt.gte = new Date(filters.fromDate);
            if (filters.toDate)
                where.createdAt.lte = new Date(filters.toDate);
        }
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: { commissionSnapshot: true, ticket: { select: { ticketNumber: true, pnrNumber: true, pdfUrl: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.booking.count({ where }),
        ]);
        return { bookings, total, page, limit, pages: Math.ceil(total / limit) };
    }
    async getCommissionSummary(agentId, fromDate, toDate) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = { agentId };
        if (fromDate || toDate) {
            where.createdAt = {};
            if (fromDate)
                where.createdAt.gte = new Date(fromDate);
            if (toDate)
                where.createdAt.lte = new Date(toDate);
        }
        const snapshots = await prisma.commissionSnapshot.findMany({ where });
        const total = snapshots.reduce((sum, s) => sum + Number(s.commissionAmt), 0);
        const reversed = snapshots.reduce((sum, s) => sum + Number(s.reversalAmt ?? 0), 0);
        return {
            totalCommission: total,
            reversedCommission: reversed,
            netCommission: total - reversed,
            count: snapshots.length,
        };
    }
    // --------------------------------------------------------------------------
    // Private helpers
    // --------------------------------------------------------------------------
    _safeAgent(agent) {
        if (!agent)
            return null;
        const { ...rest } = agent;
        return rest;
    }
    _safeUser(user) {
        if (!user)
            return null;
        const { passwordHash, ...rest } = user;
        return rest;
    }
    _safeWallet(wallet) {
        if (!wallet)
            return null;
        const { version, frozenBy, ...rest } = wallet;
        return rest;
    }
}
exports.AgentsService = AgentsService;
//# sourceMappingURL=agents.service.js.map