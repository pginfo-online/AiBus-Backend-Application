import { Request, Response, NextFunction } from 'express';
export declare class AuditLogController {
    private readonly service;
    listAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAuditLogById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=audit-log.controller.d.ts.map