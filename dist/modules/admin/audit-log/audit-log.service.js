"use strict";
// ---------------------------------------------------------------------------
// Admin Audit Log — Service
// Security audit log queries, detail views, and compliance export generation
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
class AuditLogService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-audit-log' });
    static getInstance() {
        if (!AuditLogService.instance) {
            AuditLogService.instance = new AuditLogService();
        }
        return AuditLogService.instance;
    }
    /**
     * List admin activity logs with filters and pagination
     */
    async listAuditLogs(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
        if (query.adminId) {
            where.adminId = query.adminId;
        }
        if (query.module) {
            where.module = query.module;
        }
        if (query.action) {
            where.action = { contains: query.action, mode: 'insensitive' };
        }
        if (query.resourceType) {
            where.resourceType = query.resourceType;
        }
        if (query.resourceId) {
            where.resourceId = query.resourceId;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const orderBy = {};
        if (query.sortBy) {
            orderBy[query.sortBy] = query.sortOrder || 'desc';
        }
        else {
            orderBy.createdAt = 'desc';
        }
        const [total, logs] = await Promise.all([
            prisma.adminActivityLog.count({ where }),
            prisma.adminActivityLog.findMany({
                where,
                skip,
                take,
                orderBy,
            }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items: logs,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Get single audit log entry by ID
     */
    async getAuditLogById(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const log = await prisma.adminActivityLog.findUnique({
            where: { id },
        });
        if (!log) {
            throw new errors_1.NotFoundError(`Audit log with ID '${id}' not found`);
        }
        return log;
    }
    /**
     * Fetch audit logs formatted for export (CSV or JSON)
     */
    async getLogsForExport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {};
        if (query.adminId) {
            where.adminId = query.adminId;
        }
        if (query.module) {
            where.module = query.module;
        }
        if (query.action) {
            where.action = { contains: query.action, mode: 'insensitive' };
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const logs = await prisma.adminActivityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5000, // Export cap
        });
        return logs.map((log) => ({
            id: log.id,
            adminId: log.adminId,
            action: log.action,
            module: log.module,
            resourceType: log.resourceType,
            resourceId: log.resourceId || '',
            ipAddress: log.ipAddress || '',
            userAgent: log.userAgent || '',
            requestId: log.requestId || '',
            createdAt: log.createdAt.toISOString(),
            details: log.details ? JSON.stringify(log.details) : '',
        }));
    }
}
exports.AuditLogService = AuditLogService;
//# sourceMappingURL=audit-log.service.js.map