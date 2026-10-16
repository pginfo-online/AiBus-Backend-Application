import { Request, Response, NextFunction } from 'express';
export declare class LedgerManagementController {
    private static instance;
    private ledgerService;
    private constructor();
    static getInstance(): LedgerManagementController;
    listLedgerEntries: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getReconciliationReport: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    createManualAdjustment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=ledger-management.controller.d.ts.map