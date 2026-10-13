import { Request, Response, NextFunction } from 'express';
export declare class CouponManagementController {
    private readonly service;
    listCoupons: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCouponById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createCoupon: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateCoupon: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deactivateCoupon: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getCouponUsage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=coupon-management.controller.d.ts.map