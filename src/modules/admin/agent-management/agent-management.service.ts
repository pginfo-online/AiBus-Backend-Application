import { getPrismaClient } from '../../../infrastructure/database';
import { NotFoundError, ValidationError } from '../../../shared/errors';
import { AgentStatus } from '@prisma/client';
import {
  ListAgentsQuery,
  KycReviewBody,
  SuspendAgentBody,
  UpdateCreditLimitBody,
} from './agent-management.validation';

export class AgentManagementService {
  private static instance: AgentManagementService;

  private constructor() {}

  public static getInstance(): AgentManagementService {
    if (!AgentManagementService.instance) {
      AgentManagementService.instance = new AgentManagementService();
    }
    return AgentManagementService.instance;
  }

  public async listAgents(query: ListAgentsQuery) {
    const prisma = getPrismaClient();
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status as AgentStatus;
    }
    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }
    if (query.search) {
      where.OR = [
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { contactPersonName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          wallet: {
            select: {
              cashBalance: true,
              creditLimit: true,
              creditUsed: true,
              isFrozen: true,
            },
          },
          _count: {
            select: {
              bookings: true,
              staff: true,
              kycDocuments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.agent.count({ where }),
    ]);

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public async getAgentDetails(agentId: string) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        wallet: true,
        kycDocuments: true,
        bankAccounts: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    return agent;
  }

  public async reviewKyc(agentId: string, adminId: string, body: KycReviewBody) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    if (body.action === 'APPROVE') {
      return prisma.$transaction(async (tx) => {
        // Approve agent
        const updatedAgent = await tx.agent.update({
          where: { id: agentId },
          data: {
            status: AgentStatus.APPROVED,
            approvedAt: new Date(),
            approvedBy: adminId,
            rejectionReason: null,
          },
        });

        // Verify all submitted KYC documents
        await tx.agentKycDocument.updateMany({
          where: { agentId },
          data: {
            verifiedAt: new Date(),
            verifiedBy: adminId,
            rejectedAt: null,
            rejectReason: null,
          },
        });

        return updatedAgent;
      });
    } else {
      if (!body.rejectionReason) {
        throw new ValidationError('A rejection reason is required when rejecting KYC');
      }

      return prisma.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.REJECTED,
          rejectionReason: body.rejectionReason,
        },
      });
    }
  }

  public async suspendAgent(agentId: string, adminId: string, body: SuspendAgentBody) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    return prisma.$transaction(async (tx) => {
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: body.reason,
        },
      });

      await tx.agentWallet.update({
        where: { agentId },
        data: {
          isFrozen: true,
          frozenReason: body.reason,
          frozenAt: new Date(),
          frozenBy: adminId,
        },
      });

      return updatedAgent;
    });
  }

  public async reactivateAgent(agentId: string) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    return prisma.$transaction(async (tx) => {
      const updatedAgent = await tx.agent.update({
        where: { id: agentId },
        data: {
          status: AgentStatus.APPROVED,
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      await tx.agentWallet.update({
        where: { agentId },
        data: {
          isFrozen: false,
          frozenReason: null,
          frozenAt: null,
          frozenBy: null,
        },
      });

      return updatedAgent;
    });
  }

  public async updateCreditLimit(agentId: string, body: UpdateCreditLimitBody) {
    const prisma = getPrismaClient();
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    const updatedWallet = await prisma.agentWallet.update({
      where: { agentId },
      data: {
        creditLimit: body.creditLimit,
      },
    });

    return updatedWallet;
  }
}
