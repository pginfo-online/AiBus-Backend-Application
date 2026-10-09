// ---------------------------------------------------------------------------
// Admin Audit Log — Service
// Security audit log queries, detail views, and compliance export generation
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError } from '../../../shared/errors';
import { buildPagination, buildDateFilter, PaginatedResult } from '../admin.utils';
import { ListAuditLogsQuery, ExportAuditLogsQuery } from './audit-log.validation';

export class AuditLogService {
  private static instance: AuditLogService;
  private readonly logger = logger.child({ module: 'admin-audit-log' });

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * List admin activity logs with filters and pagination
   */
  public async listAuditLogs(query: ListAuditLogsQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

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

    const dateFilter = buildDateFilter(query.startDate, query.endDate, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
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
  public async getAuditLogById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const log = await prisma.adminActivityLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundError(`Audit log with ID '${id}' not found`);
    }

    return log;
  }

  /**
   * Fetch audit logs formatted for export (CSV or JSON)
   */
  public async getLogsForExport(query: ExportAuditLogsQuery): Promise<any[]> {
    const prisma = getPrismaClient();

    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.module) {
      where.module = query.module;
    }

    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }

    const dateFilter = buildDateFilter(query.startDate, query.endDate, 'createdAt');
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
