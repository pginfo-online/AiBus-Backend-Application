import { Request, Response, NextFunction } from 'express';
export declare class ReportController {
    private readonly service;
    getRevenueReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookingReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCancellationReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=report.controller.d.ts.map