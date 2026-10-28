import { Request, Response, NextFunction } from 'express';
export declare class CouponsController {
    private service;
    constructor();
    listCoupons: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCouponByCode: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    validateCoupon: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=coupons.controller.d.ts.map