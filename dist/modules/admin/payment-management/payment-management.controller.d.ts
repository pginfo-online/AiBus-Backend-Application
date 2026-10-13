import { Request, Response, NextFunction } from 'express';
export declare class PaymentManagementController {
    private service;
    constructor();
    listPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentDetails: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    reconcilePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPaymentById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=payment-management.controller.d.ts.map