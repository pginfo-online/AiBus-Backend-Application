// ---------------------------------------------------------------------------
// Admin Audit Log — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit-log.service';
import { ApiResponse } from '../../../shared/utils';
import { sendCsvResponse } from '../admin.utils';

export class AuditLogController {
  private readonly service = AuditLogService.getInstance();

  public listAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listAuditLogs(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getAuditLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const log = await this.service.getAuditLogById(id);
      ApiResponse.success(res, log, 'Audit log retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public exportAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const logs = await this.service.getLogsForExport(query);

      if (query.format === 'json') {
        ApiResponse.success(res, logs, 'Audit logs exported successfully');
        return;
      }

      const headers = [
        'id',
        'adminId',
        'action',
        'module',
        'resourceType',
        'resourceId',
        'ipAddress',
        'userAgent',
        'requestId',
        'createdAt',
        'details',
      ];

      sendCsvResponse(res, `audit-logs-${Date.now()}.csv`, headers, logs);
    } catch (error) {
      next(error);
    }
  };
}
