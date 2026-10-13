import { Request, Response, NextFunction } from 'express';
export declare class UserManagementController {
    private service;
    constructor();
    listUsers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    suspendUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    activateUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserWallet: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getUserWalletTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=user-management.controller.d.ts.map