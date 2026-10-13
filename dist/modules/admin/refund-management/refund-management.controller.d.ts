import { Request, Response, NextFunction } from 'express';
export declare class RefundManagementController {
    private readonly service;
    listRefunds: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRefundById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    processRefund: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    retryRefund: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRefundStats: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=refund-management.controller.d.ts.map