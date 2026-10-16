import { Request, Response, NextFunction } from 'express';
export declare class CommissionManagementController {
    private static instance;
    private commissionService;
    private constructor();
    static getInstance(): CommissionManagementController;
    listRules: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    toggleRuleStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=commission-management.controller.d.ts.map