import { Request, Response, NextFunction } from 'express';
export declare class AgentsController {
    private static instance;
    private agentsService;
    private constructor();
    static getInstance(): AgentsController;
    register: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateProfile: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    submitKycDocument: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getKycStatus: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    addBankAccount: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listBankAccounts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    inviteStaff: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listStaff: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateStaffRole: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    removeStaff: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getWallet: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    initiateTopup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    confirmTopup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getStatement: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCommissions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    exportReport: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=agents.controller.d.ts.map