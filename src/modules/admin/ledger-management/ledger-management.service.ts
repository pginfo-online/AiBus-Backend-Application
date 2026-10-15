import { getPrismaClient } from '../../../infrastructure/database';
import { NotFoundError, ConflictError, ValidationError } from '../../../shared/errors';
import { LedgerEntryType } from '@prisma/client';
import {
  ListLedgerQuery,
  ManualAdjustmentBody,
} from './ledger-management.validation';
import {
  buildLedgerPostingData,
  LedgerLine,
} from '../../../infrastructure/ledger';

export class LedgerManagementService {
  private static instance: LedgerManagementService;

  private constructor() {}

  public static getInstance(): LedgerManagementService {
    if (!LedgerManagementService.instance) {
      LedgerManagementService.instance = new LedgerManagementService();
    }
    return LedgerManagementService.instance;
  }

  public async listLedgerEntries(query: ListLedgerQuery) {
    const prisma = getPrismaClient();
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.agentId) where.agentId = query.agentId;
    if (query.bookingId) where.bookingId = query.bookingId;
    if (query.type) where.type = query.type as LedgerEntryType;
    if (query.fromDate || query.toDate) {
      where.postedAt = {};
      if (query.fromDate) where.postedAt.gte = new Date(query.fromDate);
      if (query.toDate) where.postedAt.lte = new Date(query.toDate);
    }

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          agent: {
            select: { id: true, businessName: true, email: true },
          },
        },
        orderBy: { postedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return {
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getReconciliationReport() {
    const prisma = getPrismaClient();

    const agents = await prisma.agent.findMany({
      include: {
        wallet: true,
      },
      orderBy: { businessName: 'asc' },
    });

    const reportItems = await Promise.all(
      agents.map(async (agent) => {
        const wallet = agent.wallet;
        const currentBalance = wallet ? Number(wallet.cashBalance) : 0;

        // Group entries for this agent
        const entries = await prisma.ledgerEntry.findMany({
          where: { agentId: agent.id },
          select: {
            type: true,
            debitAmount: true,
            creditAmount: true,
          },
        });

        let totalCredits = 0;
        let totalDebits = 0;

        for (const entry of entries) {
          const credit = Number(entry.creditAmount);
          const debit = Number(entry.debitAmount);

          // Agent wallet credits
          if (
            entry.type === LedgerEntryType.AGENT_WALLET_TOPUP ||
            entry.type === LedgerEntryType.REFUND_CREDIT ||
            entry.type === LedgerEntryType.AGENT_WALLET_CREDIT
          ) {
            totalCredits += credit;
          } else if (
            entry.type === LedgerEntryType.MANUAL_ADJUSTMENT &&
            credit > 0
          ) {
            totalCredits += credit;
          }

          // Agent wallet debits
          if (
            entry.type === LedgerEntryType.AGENT_WALLET_DEBIT ||
            entry.type === LedgerEntryType.CONVENIENCE_FEE_DEBIT
          ) {
            totalDebits += debit;
          } else if (
            entry.type === LedgerEntryType.MANUAL_ADJUSTMENT &&
            debit > 0
          ) {
            totalDebits += debit;
          }
        }

        const calculatedBalance = Math.round((totalCredits - totalDebits) * 100) / 100;
        const discrepancy = Math.round(Math.abs(calculatedBalance - currentBalance) * 100) / 100;
        const isMatched = discrepancy < 0.01;

        return {
          agentId: agent.id,
          businessName: agent.businessName,
          status: agent.status,
          currentBalance,
          calculatedBalance,
          totalCredits,
          totalDebits,
          discrepancy,
          reconciliationStatus: isMatched ? 'MATCHED' : 'DISCREPANCY_DETECTED',
        };
      })
    );

    const totalDiscrepancies = reportItems.filter(
      (r) => r.reconciliationStatus === 'DISCREPANCY_DETECTED'
    ).length;

    return {
      totalAgentsAudited: reportItems.length,
      matchedAgents: reportItems.length - totalDiscrepancies,
      discrepantAgents: totalDiscrepancies,
      auditTimestamp: new Date(),
      agents: reportItems,
    };
  }

  public async createManualAdjustment(adminId: string, body: ManualAdjustmentBody) {
    const prisma = getPrismaClient();

    const agent = await prisma.agent.findUnique({
      where: { id: body.agentId },
      include: { wallet: true },
    });
    if (!agent) throw new NotFoundError('Agent not found');
    if (!agent.wallet) throw new NotFoundError('Agent wallet record not found');

    const wallet = agent.wallet;
    const isCredit = body.direction === 'CREDIT_AGENT';
    const amount = body.amount;

    if (!isCredit && Number(wallet.cashBalance) < amount) {
      throw new ValidationError(
        `Cannot debit agent wallet: current balance (₹${wallet.cashBalance}) is less than debit amount (₹${amount})`
      );
    }

    const idempotencyKey = body.idempotencyKey || `ADJ-${body.agentId}-${Date.now()}`;

    // Verify idempotency
    const existing = await prisma.ledgerEntry.findFirst({
      where: { idempotencyKey: `${idempotencyKey}:agent` },
    });
    if (existing) {
      throw new ConflictError('A manual adjustment with this idempotency key was already posted');
    }

    const lines: LedgerLine[] = isCredit
      ? [
          {
            type: LedgerEntryType.MANUAL_ADJUSTMENT,
            debitAmount: 0,
            creditAmount: amount,
            description: `Manual credit adjustment: ${body.reason}`,
            idempotencyKey: `${idempotencyKey}:agent`,
          },
          {
            type: LedgerEntryType.PLATFORM_REVENUE_CREDIT,
            debitAmount: amount,
            creditAmount: 0,
            description: `Platform adjustment expense for agent ${agent.businessName}`,
            idempotencyKey: `${idempotencyKey}:platform`,
          },
        ]
      : [
          {
            type: LedgerEntryType.MANUAL_ADJUSTMENT,
            debitAmount: amount,
            creditAmount: 0,
            description: `Manual debit adjustment: ${body.reason}`,
            idempotencyKey: `${idempotencyKey}:agent`,
          },
          {
            type: LedgerEntryType.PLATFORM_REVENUE_CREDIT,
            debitAmount: 0,
            creditAmount: amount,
            description: `Platform recovery from agent ${agent.businessName}`,
            idempotencyKey: `${idempotencyKey}:platform`,
          },
        ];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update wallet balance with optimistic locking
      const updateData = isCredit
        ? {
            cashBalance: { increment: amount },
            version: { increment: 1 },
          }
        : {
            cashBalance: { decrement: amount },
            version: { increment: 1 },
          };

      const walletUpdate = await tx.agentWallet.updateMany({
        where: { id: wallet.id, version: wallet.version },
        data: updateData,
      });

      if (walletUpdate.count === 0) {
        throw new ConflictError('Concurrent wallet modification detected. Please retry.');
      }

      // 2. Post balanced double-entry ledger batch
      const ledgerData = buildLedgerPostingData({
        agentId: agent.id,
        referenceId: `MANUAL-${adminId}`,
        createdBy: adminId,
        lines,
      });

      await tx.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });

      return tx.agentWallet.findUnique({ where: { agentId: agent.id } });
    });

    return {
      success: true,
      agentId: agent.id,
      direction: body.direction,
      amount,
      updatedWallet: result,
    };
  }
}
