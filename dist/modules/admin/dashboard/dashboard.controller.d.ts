import { Request, Response, NextFunction } from 'express';
export declare class DashboardController {
    private service;
    constructor();
    getOverview: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRevenueAnalytics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookingAnalytics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserAnalytics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSystemHealth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=dashboard.controller.d.ts.map