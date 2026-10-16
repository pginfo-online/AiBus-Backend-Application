import { Request, Response, NextFunction } from 'express';
export declare class OperatorManagementController {
    private readonly service;
    listOperators: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOperatorById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createOperator: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateOperator: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    suspendOperator: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    activateOperator: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getOperatorBookings: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=operator-management.controller.d.ts.map