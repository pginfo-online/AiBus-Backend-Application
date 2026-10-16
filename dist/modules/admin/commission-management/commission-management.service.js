"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const errors_1 = require("../../../shared/errors");
const client_1 = require("@prisma/client");
class CommissionManagementService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!CommissionManagementService.instance) {
            CommissionManagementService.instance = new CommissionManagementService();
        }
        return CommissionManagementService.instance;
    }
    async listRules(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.agentId)
            where.agentId = query.agentId;
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
    async createRule(adminId, body) {
        const prisma = (0, database_1.getPrismaClient)();
        return prisma.commissionRule.create({
            data: {
                name: body.name,
                ruleType: body.ruleType,
                agentId: body.agentId ?? null,
                operatorName: body.operatorName ?? null,
                fromCityId: body.fromCityId ?? null,
                toCityId: body.toCityId ?? null,
                percentage: body.percentage !== undefined && body.percentage !== null ? new client_1.Prisma.Decimal(body.percentage) : null,
                flatAmount: body.flatAmount !== undefined && body.flatAmount !== null ? new client_1.Prisma.Decimal(body.flatAmount) : null,
                minFare: body.minFare !== undefined && body.minFare !== null ? new client_1.Prisma.Decimal(body.minFare) : null,
                maxCommission: body.maxCommission !== undefined && body.maxCommission !== null ? new client_1.Prisma.Decimal(body.maxCommission) : null,
                priority: body.priority ?? 0,
                effectiveFrom: body.effectiveFrom ?? new Date(),
                effectiveUntil: body.effectiveUntil ?? null,
                isActive: true,
                createdBy: adminId,
            },
        });
    }
    async updateRule(ruleId, body) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
        if (!existing)
            throw new errors_1.NotFoundError('Commission rule not found');
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.ruleType !== undefined)
            data.ruleType = body.ruleType;
        if (body.agentId !== undefined)
            data.agentId = body.agentId;
        if (body.operatorName !== undefined)
            data.operatorName = body.operatorName;
        if (body.fromCityId !== undefined)
            data.fromCityId = body.fromCityId;
        if (body.toCityId !== undefined)
            data.toCityId = body.toCityId;
        if (body.percentage !== undefined) {
            data.percentage = body.percentage !== null ? new client_1.Prisma.Decimal(body.percentage) : null;
        }
        if (body.flatAmount !== undefined) {
            data.flatAmount = body.flatAmount !== null ? new client_1.Prisma.Decimal(body.flatAmount) : null;
        }
        if (body.minFare !== undefined) {
            data.minFare = body.minFare !== null ? new client_1.Prisma.Decimal(body.minFare) : null;
        }
        if (body.maxCommission !== undefined) {
            data.maxCommission = body.maxCommission !== null ? new client_1.Prisma.Decimal(body.maxCommission) : null;
        }
        if (body.priority !== undefined)
            data.priority = body.priority;
        if (body.effectiveFrom !== undefined)
            data.effectiveFrom = body.effectiveFrom;
        if (body.effectiveUntil !== undefined)
            data.effectiveUntil = body.effectiveUntil;
        return prisma.commissionRule.update({
            where: { id: ruleId },
            data,
        });
    }
    async toggleRuleStatus(ruleId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
        if (!existing)
            throw new errors_1.NotFoundError('Commission rule not found');
        return prisma.commissionRule.update({
            where: { id: ruleId },
            data: { isActive: !existing.isActive },
        });
    }
    async deleteRule(ruleId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.commissionRule.findUnique({ where: { id: ruleId } });
        if (!existing)
            throw new errors_1.NotFoundError('Commission rule not found');
        return prisma.commissionRule.delete({ where: { id: ruleId } });
    }
}
exports.CommissionManagementService = CommissionManagementService;
//# sourceMappingURL=commission-management.service.js.map