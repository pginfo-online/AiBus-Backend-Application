import { PaginatedResult } from '../admin.utils';
import { ListAuditLogsQuery, ExportAuditLogsQuery } from './audit-log.validation';
export declare class AuditLogService {
    private static instance;
    private readonly logger;
    static getInstance(): AuditLogService;
    /**
     * List admin activity logs with filters and pagination
     */
    listAuditLogs(query: ListAuditLogsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get single audit log entry by ID
     */
    getAuditLogById(id: string): Promise<any>;
    /**
     * Fetch audit logs formatted for export (CSV or JSON)
     */
    getLogsForExport(query: ExportAuditLogsQuery): Promise<any[]>;
}
//# sourceMappingURL=audit-log.service.d.ts.map