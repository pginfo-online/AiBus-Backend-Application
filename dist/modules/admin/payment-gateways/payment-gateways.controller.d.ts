import { Request, Response, NextFunction } from 'express';
export declare class PaymentGatewayAdminController {
    private service;
    constructor();
    listGateways: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateGateway: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    toggleGateway: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getGatewayMetrics: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=payment-gateways.controller.d.ts.map