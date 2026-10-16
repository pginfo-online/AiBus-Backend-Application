import { Request, Response, NextFunction } from 'express';
export declare class ProviderManagementController {
    private readonly service;
    getProviders: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProviderHealth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTransactionById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProviderBalance: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=provider-management.controller.d.ts.map