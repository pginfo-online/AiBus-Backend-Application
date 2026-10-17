import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { env, isDevelopment, isTest } from '../../config/env';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from '../../shared/errors';
import {
  AgentStatus,
  AgentKycDocType,
  AgentStaffRole,
  TopupStatus,
  UserRole,
  UserStatus,
  Prisma,
} from '@prisma/client';
import {
  RegisterAgentInput,
  AddBankAccountInput,
  InviteStaffInput,
  UpdateStaffRoleInput,
  InitiateTopupInput,
  UpdateAgentProfileInput,
} from './agents.validation';
import { buildLedgerPostingData, buildTopupLines } from '../../infrastructure/ledger';
import { PaymentOrchestrator } from '../../infrastructure/payments';
import { AuthService } from '../auth/auth.service';

const agentLogger = logger.child({ module: 'agents-service' });

// ---------------------------------------------------------------------------
// PhonePe helpers (reuse pattern from PaymentsService)
// ---------------------------------------------------------------------------
const PHONEPE_CHECKOUT_BASE =
  env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/pg'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const PHONEPE_OAUTH_URL =
  env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

let _ppTokenCache: { token: string; expiresAt: number } | null = null;

async function getPhonePeToken(): Promise<string> {
  if (_ppTokenCache && _ppTokenCache.expiresAt > Date.now() + 60000) {
    return _ppTokenCache.token;
  }
  if (isDevelopment || isTest) return `MOCK-OAUTH-${Date.now()}`;

  const params = new URLSearchParams({
    client_id: env.PHONEPE_CLIENT_ID || '',
    client_secret: env.PHONEPE_CLIENT_SECRET || '',
    client_version: env.PHONEPE_CLIENT_VERSION || '1',
    grant_type: 'client_credentials',
  });
  const res = await axios.post(PHONEPE_OAUTH_URL, params.toString(), {
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
export class AgentsService {
  private static instance: AgentsService;
  private authService: AuthService;

  private constructor() {
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): AgentsService {
    if (!AgentsService.instance) {
      AgentsService.instance = new AgentsService();
    }
    return AgentsService.instance;
  }

  // --------------------------------------------------------------------------
  // 1. Register Agent + Create Owner User Account
  // --------------------------------------------------------------------------
  public async registerAgent(input: RegisterAgentInput) {
    const prisma = getPrismaClient();

    // Check for duplicate agent email
    const existing = await prisma.agent.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('An agent account with this email already exists');

    // Check for duplicate user email (agent owner user)
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) throw new ConflictError('An account with this email already exists');

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

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
          status: AgentStatus.PENDING_KYC,
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
          role: UserRole.OPERATOR_AGENT,
          status: UserStatus.ACTIVE,
        },
      });

      // Link as OWNER staff
      await tx.agentStaff.create({
        data: {
          agentId: agent.id,
          userId: user.id,
          role: AgentStaffRole.OWNER,
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

    agentLogger.info(
      { agentId: result.agent.id, userId: result.user.id },
      'Agent registered — pending KYC'
    );

    // Generate auth tokens for the new owner user
    const tokens = await (this.authService as any).generateTokenPair(
      result.user.id,
      result.user.role
    );

    return {
      agent: this._safeAgent(result.agent),
      user: this._safeUser(result.user),
      tokens,
    };
  }

  // --------------------------------------------------------------------------
  // 2. Get Agent Profile (derived from userId via AgentStaff)
  // --------------------------------------------------------------------------
  public async getAgentForUser(userId: string) {
    const prisma = getPrismaClient();
    const staff = await prisma.agentStaff.findFirst({
      where: { userId, isActive: true },
      include: { agent: { include: { wallet: true } } },
    });
    if (!staff) throw new NotFoundError('No agent organization found for this user');
    return { ...this._safeAgent(staff.agent), wallet: this._safeWallet(staff.agent.wallet) };
  }

  public async getAgentById(agentId: string) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { wallet: true, kycDocuments: true, bankAccounts: true, staff: { include: { user: true } } },
    });
    if (!agent) throw new NotFoundError('Agent not found');
    return agent;
  }

  public async updateProfile(agentId: string, input: UpdateAgentProfileInput) {
    const prisma = getPrismaClient();
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
  public async submitKycDocument(
    agentId: string,
    docType: AgentKycDocType,
    fileUrl: string,
    storageKey: string
  ) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    if (
      agent.status !== AgentStatus.PENDING_KYC &&
      agent.status !== AgentStatus.KYC_SUBMITTED &&
      agent.status !== AgentStatus.REJECTED
    ) {
      throw new ValidationError(`Cannot submit KYC in status ${agent.status}`);
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
    if (agent.status === AgentStatus.PENDING_KYC || agent.status === AgentStatus.REJECTED) {
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: AgentStatus.KYC_SUBMITTED },
      });
    }

    agentLogger.info({ agentId, docType }, 'KYC document submitted');
    return doc;
  }

  public async getKycStatus(agentId: string) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { kycDocuments: true },
    });
    if (!agent) throw new NotFoundError('Agent not found');
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
  public async addBankAccount(agentId: string, input: AddBankAccountInput) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

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

  public async listBankAccounts(agentId: string) {
    const prisma = getPrismaClient();
    return prisma.agentBankAccount.findMany({ where: { agentId }, orderBy: { createdAt: 'asc' } });
  }

  // --------------------------------------------------------------------------
  // 5. Agent Staff Management
  // --------------------------------------------------------------------------
  public async inviteStaff(agentId: string, input: InviteStaffInput) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');
    if (agent.status !== AgentStatus.APPROVED) {
      throw new ValidationError('Agent must be APPROVED to manage staff');
    }

    // Find or create user account for the staff member
    let user = await prisma.user.findUnique({ where: { email: input.email } });
    let isNewUser = false;

    if (!user) {
      // Create a placeholder user; they'll set their own password on first login
      const tempPassword = uuidv4(); // Random; they'll reset via email
      const passwordHash = await bcrypt.hash(tempPassword, env.BCRYPT_ROUNDS);
      user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: '',
          lastName: '',
          role: UserRole.OPERATOR_AGENT,
          status: UserStatus.ACTIVE,
        },
      });
      isNewUser = true;
    }

    // Check if already a staff member
    const existing = await prisma.agentStaff.findUnique({
      where: { agentId_userId: { agentId, userId: user.id } },
    });
    if (existing && existing.isActive) {
      throw new ConflictError('User is already a staff member of this agent organization');
    }

    const staff = await prisma.agentStaff.upsert({
      where: { agentId_userId: { agentId, userId: user.id } },
      create: {
        agentId,
        userId: user.id,
        role: input.role as AgentStaffRole,
        permissions: input.permissions ? (input.permissions as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: true,
        invitedAt: new Date(),
      },
      update: {
        role: input.role as AgentStaffRole,
        permissions: input.permissions ? (input.permissions as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: true,
        invitedAt: new Date(),
      },
    });

    agentLogger.info({ agentId, userId: user.id, role: input.role }, 'Staff invited');
    return { staff, user: this._safeUser(user), isNewUser };
  }

  public async listStaff(agentId: string) {
    const prisma = getPrismaClient();
    return prisma.agentStaff.findMany({
      where: { agentId, isActive: true },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true } } },
      orderBy: { invitedAt: 'asc' },
    });
  }

  public async updateStaffRole(agentId: string, staffId: string, input: UpdateStaffRoleInput) {
    const prisma = getPrismaClient();
    const staff = await prisma.agentStaff.findUnique({ where: { id: staffId } });
    if (!staff || staff.agentId !== agentId) throw new NotFoundError('Staff member not found');
    if (staff.role === AgentStaffRole.OWNER) throw new ValidationError('Cannot change the OWNER role');
    return prisma.agentStaff.update({
      where: { id: staffId },
      data: {
        role: input.role as AgentStaffRole,
        permissions: input.permissions ? (input.permissions as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  public async removeStaff(agentId: string, staffId: string) {
    const prisma = getPrismaClient();
    const staff = await prisma.agentStaff.findUnique({ where: { id: staffId } });
    if (!staff || staff.agentId !== agentId) throw new NotFoundError('Staff member not found');
    if (staff.role === AgentStaffRole.OWNER) throw new ValidationError('Cannot remove the OWNER');
    return prisma.agentStaff.update({ where: { id: staffId }, data: { isActive: false } });
  }

  // --------------------------------------------------------------------------
  // 6. Wallet — Balance & Statement
  // --------------------------------------------------------------------------
  public async getWallet(agentId: string) {
    const prisma = getPrismaClient();
    const wallet = await prisma.agentWallet.findUnique({ where: { agentId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    return this._safeWallet(wallet);
  }

  public async getWalletStatement(
    agentId: string,
    page = 1,
    limit = 50,
    fromDate?: string,
    toDate?: string
  ) {
    const prisma = getPrismaClient();
    const skip = (page - 1) * limit;
    const where: any = { agentId };
    if (fromDate || toDate) {
      where.postedAt = {};
      if (fromDate) {
        where.postedAt.gte = fromDate.includes('T') ? new Date(fromDate) : new Date(`${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        where.postedAt.lte = toDate.includes('T') ? new Date(toDate) : new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    const [rawEntries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    const entries = rawEntries.map((e) => {
      const isCredit =
        Number(e.creditAmount) > 0 ||
        e.type.includes('CREDIT') ||
        e.type.includes('TOPUP');
      const amount =
        Number(e.creditAmount) > 0
          ? Number(e.creditAmount)
          : Number(e.debitAmount) > 0
          ? Number(e.debitAmount)
          : 0;

      return {
        ...e,
        entryType: isCredit ? ('CREDIT' as const) : ('DEBIT' as const),
        accountType: e.type,
        amount,
        balanceAfter: 0,
        debitAmount: Number(e.debitAmount),
        creditAmount: Number(e.creditAmount),
        postedAt: e.postedAt.toISOString(),
      };
    });

    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // --------------------------------------------------------------------------
  // 7. Wallet Top-up Initiation (PhonePe)
  // --------------------------------------------------------------------------
  public async initiateTopup(agentId: string, input: InitiateTopupInput) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');
    if (agent.status !== AgentStatus.APPROVED) {
      throw new ValidationError('Agent must be APPROVED to top up wallet');
    }

    // Idempotency check
    if (input.idempotencyKey) {
      const existing = await prisma.walletTopup.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return { topup: existing, isIdempotent: true };
    }

    const redirectUrl = input.redirectUrl || env.PHONEPE_REDIRECT_URL || 'http://localhost:5173/wallet';

    const orchestrator = PaymentOrchestrator.getInstance();
    const intentResult = await orchestrator.createPaymentIntentWithFallback(
      {
        bookingId: agentId,
        bookingNumber: `TOPUP-${agentId.slice(0, 8).toUpperCase()}`,
        amount: input.amount,
        currency: 'INR',
        customerName: agent.businessName,
        customerEmail: agent.email,
        customerPhone: agent.phone,
        redirectUrl,
        isTopup: true,
      },
      input.gateway || 'AUTO'
    );

    const topup = await prisma.walletTopup.create({
      data: {
        agentId,
        amount: input.amount,
        status: TopupStatus.INITIATED,
        gateway: intentResult.gateway,
        merchantTxnId: intentResult.merchantTxnId,
        gatewayOrderId: intentResult.gatewayOrderId,
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });

    agentLogger.info(
      { agentId, topupId: topup.id, amount: input.amount, gateway: intentResult.gateway },
      'Wallet top-up initiated via orchestrator'
    );

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
  public async confirmTopup(merchantTxnId: string, gatewayPaymentId?: string) {
    const prisma = getPrismaClient();

    const topup = await prisma.walletTopup.findUnique({ where: { merchantTxnId } });
    if (!topup) throw new NotFoundError(`Top-up not found: ${merchantTxnId}`);
    if (topup.status === TopupStatus.COMPLETED) {
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
          status: TopupStatus.COMPLETED,
          gatewayPaymentId: gatewayPaymentId ?? null,
          webhookVerified: true,
          completedAt: new Date(),
        },
      });

      // Credit wallet — optimistic lock on version
      const wallet = await tx.agentWallet.findUnique({ where: { agentId: topup.agentId } });
      if (!wallet) throw new Error(`AgentWallet missing for agent ${topup.agentId}`);

      await tx.agentWallet.updateMany({
        where: { agentId: topup.agentId, version: wallet.version },
        data: {
          cashBalance: { increment: amount },
          totalTopups: { increment: amount },
          version: { increment: 1 },
        },
      });

      // Post balanced ledger entries
      const lines = buildTopupLines({ topupId: topup.id, agentId: topup.agentId, amount, idempotencyPrefix });
      const ledgerData = buildLedgerPostingData({
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
  public async getBookingHistory(agentId: string, filters: { page?: number; limit?: number; status?: string; fromDate?: string; toDate?: string }) {
    const prisma = getPrismaClient();
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { agentId };
    if (filters.status) where.status = filters.status;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = filters.fromDate.includes('T')
          ? new Date(filters.fromDate)
          : new Date(`${filters.fromDate}T00:00:00.000Z`);
      }
      if (filters.toDate) {
        where.createdAt.lte = filters.toDate.includes('T')
          ? new Date(filters.toDate)
          : new Date(`${filters.toDate}T23:59:59.999Z`);
      }
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

  public async getCommissionSummary(agentId: string, fromDate?: string, toDate?: string) {
    const prisma = getPrismaClient();
    const where: any = { agentId };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate.includes('T')
          ? new Date(fromDate)
          : new Date(`${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        where.createdAt.lte = toDate.includes('T')
          ? new Date(toDate)
          : new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    const rawSnapshots = await prisma.commissionSnapshot.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            providerPnrNo: true,
            operatorName: true,
            fromCityName: true,
            toCityName: true,
            journeyDate: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const total = rawSnapshots.reduce((sum, s) => sum + Number(s.commissionAmt), 0);
    const reversed = rawSnapshots.reduce((sum, s) => sum + Number(s.reversalAmt ?? 0), 0);

    const snapshots = rawSnapshots.map((s) => ({
      id: s.id,
      bookingId: s.bookingId,
      bookingNumber: s.booking?.bookingNumber,
      providerPnrNo: s.booking?.providerPnrNo,
      operatorName: s.booking?.operatorName,
      route:
        s.booking?.fromCityName && s.booking?.toCityName
          ? `${s.booking.fromCityName} → ${s.booking.toCityName}`
          : undefined,
      travelDate: s.booking?.journeyDate,
      bookingStatus: s.booking?.status,
      grossFare: Number(s.grossFare),
      baseFareForCommission: Number(s.baseFareForCommission),
      commissionRate: Number(s.commissionRate),
      commissionAmt: Number(s.commissionAmt),
      netFare: Number(s.netFare),
      reversedAt: s.reversedAt?.toISOString() ?? null,
      reversalAmt: s.reversalAmt ? Number(s.reversalAmt) : null,
      createdAt: s.createdAt.toISOString(),
    }));

    return {
      totalCommission: total,
      reversedCommission: reversed,
      netCommission: total - reversed,
      count: rawSnapshots.length,
      snapshots,
    };
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------
  private _safeAgent(agent: any) {
    if (!agent) return null;
    const { ...rest } = agent;
    return rest;
  }

  private _safeUser(user: any) {
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private _safeWallet(wallet: any) {
    if (!wallet) return null;
    const { version, frozenBy, ...rest } = wallet;
    return rest;
  }
}
