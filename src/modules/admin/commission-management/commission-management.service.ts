import { getPrismaClient } from '../../../infrastructure/database';
import { NotFoundError } from '../../../shared/errors';
import { CommissionRuleType, Prisma } from '@prisma/client';
import {
  ListCommissionRulesQuery,
  CreateCommissionRuleBody,
  UpdateCommissionRuleBody,
} from './commission-management.validation';

export class CommissionManagementService {
  private static instance: CommissionManagementService;

  private constructor() {}

  public static getInstance(): CommissionManagementService {
    if (!CommissionManagementService.instance) {
      CommissionManagementService.instance = new CommissionManagementService();
    }
    return CommissionManagementService.instance;
  }

  public async listRules(query: ListCommissionRulesQuery) {
    const prisma = getPrismaClient();
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.agentId) where.agentId = query.agentId;
    if (query.operatorName) {
      where.operatorName = { contains: query.operatorName, mode: 'insensitive' };
    }
    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    const [rules, total] = await Promise.all([
      prisma.commissionRule.findMany({
        where,
        include: {
          agent: {
            select: { id: true, businessName: true, email: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.commissionRule.count({ where }),
    ]);

    return {
      rules,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async createRule(adminId: string, body: CreateCommissionRuleBody) {
    const prisma = getPrismaClient();

    return prisma.commissionRule.create({
      data: {
        name: body.name,
        ruleType: body.ruleType as CommissionRuleType,
        agentId: body.agentId ?? null,
        operatorName: body.operatorName ?? null,
        fromCityId: body.fromCityId ?? null,
        toCityId: body.toCityId ?? null,
        percentage: body.percentage !== undefined && body.percentage !== null ? new Prisma.Decimal(body.percentage) : null,
        flatAmount: body.flatAmount !== undefined && body.flatAmount !== null ? new Prisma.Decimal(body.flatAmount) : null,
        minFare: body.minFare !== undefined && body.minFare !== null ? new Prisma.Decimal(body.minFare) : null,
        maxCommission: body.maxCommission !== undefined && body.maxCommission !== null ? new Prisma.Decimal(body.maxCommission) : null,
        priority: body.priority ?? 0,
        effectiveFrom: body.effectiveFrom ?? new Date(),
        effectiveUntil: body.effectiveUntil ?? null,
        isActive: true,
        createdBy: adminId,
      },
    });
  }

  public async updateRule(ruleId: string, body: UpdateCommissionRuleBody) {
    const prisma = getPrismaClient();
    const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundError('Commission rule not found');

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.ruleType !== undefined) data.ruleType = body.ruleType as CommissionRuleType;
    if (body.agentId !== undefined) data.agentId = body.agentId;
    if (body.operatorName !== undefined) data.operatorName = body.operatorName;
    if (body.fromCityId !== undefined) data.fromCityId = body.fromCityId;
    if (body.toCityId !== undefined) data.toCityId = body.toCityId;
    if (body.percentage !== undefined) {
      data.percentage = body.percentage !== null ? new Prisma.Decimal(body.percentage) : null;
    }
    if (body.flatAmount !== undefined) {
      data.flatAmount = body.flatAmount !== null ? new Prisma.Decimal(body.flatAmount) : null;
    }
    if (body.minFare !== undefined) {
      data.minFare = body.minFare !== null ? new Prisma.Decimal(body.minFare) : null;
    }
    if (body.maxCommission !== undefined) {
      data.maxCommission = body.maxCommission !== null ? new Prisma.Decimal(body.maxCommission) : null;
    }
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.effectiveFrom !== undefined) data.effectiveFrom = body.effectiveFrom;
    if (body.effectiveUntil !== undefined) data.effectiveUntil = body.effectiveUntil;

    return prisma.commissionRule.update({
      where: { id: ruleId },
      data,
    });
  }

  public async toggleRuleStatus(ruleId: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundError('Commission rule not found');

    return prisma.commissionRule.update({
      where: { id: ruleId },
      data: { isActive: !existing.isActive },
    });
  }

  public async deleteRule(ruleId: string) {
    const prisma = getPrismaClient();
    const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
    if (!existing) throw new NotFoundError('Commission rule not found');

    return prisma.commissionRule.delete({ where: { id: ruleId } });
  }
}
