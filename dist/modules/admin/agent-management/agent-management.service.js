"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const errors_1 = require("../../../shared/errors");
const client_1 = require("@prisma/client");
class AgentManagementService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!AgentManagementService.instance) {
            AgentManagementService.instance = new AgentManagementService();
        }
        return AgentManagementService.instance;
    }
    async listAgents(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status) {
            where.status = query.status;
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
    async getAgentDetails(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errors_1.NotFoundError('Agent not found');
        }
        return agent;
    }
    async reviewKyc(agentId, adminId, body) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        if (body.action === 'APPROVE') {
            return prisma.$transaction(async (tx) => {
                // Approve agent
                const updatedAgent = await tx.agent.update({
                    where: { id: agentId },
                    data: {
                        status: client_1.AgentStatus.APPROVED,
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
        }
        else {
            if (!body.rejectionReason) {
                throw new errors_1.ValidationError('A rejection reason is required when rejecting KYC');
            }
            return prisma.agent.update({
                where: { id: agentId },
                data: {
                    status: client_1.AgentStatus.REJECTED,
                    rejectionReason: body.rejectionReason,
                },
            });
        }
    }
    async suspendAgent(agentId, adminId, body) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        return prisma.$transaction(async (tx) => {
            const updatedAgent = await tx.agent.update({
                where: { id: agentId },
                data: {
                    status: client_1.AgentStatus.SUSPENDED,
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
    async reactivateAgent(agentId) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        return prisma.$transaction(async (tx) => {
            const updatedAgent = await tx.agent.update({
                where: { id: agentId },
                data: {
                    status: client_1.AgentStatus.APPROVED,
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
    async updateCreditLimit(agentId, body) {
        const prisma = (0, database_1.getPrismaClient)();
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent)
            throw new errors_1.NotFoundError('Agent not found');
        const updatedWallet = await prisma.agentWallet.update({
            where: { agentId },
            data: {
                creditLimit: body.creditLimit,
            },
        });
        return updatedWallet;
    }
}
exports.AgentManagementService = AgentManagementService;
//# sourceMappingURL=agent-management.service.js.map