// ---------------------------------------------------------------------------
// Admin Coupon Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { CouponManagementService } from './coupon-management.service';
import { ApiResponse } from '../../../shared/utils';

export class CouponManagementController {
  private readonly service = CouponManagementService.getInstance();

  public listCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listCoupons(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Coupons retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCouponById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const coupon = await this.service.getCouponById(id);
      ApiResponse.success(res, coupon, 'Coupon details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const coupon = await this.service.createCoupon(req.body, adminId);
      ApiResponse.created(res, coupon, 'Coupon created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const coupon = await this.service.updateCoupon(id, req.body, adminId);
      ApiResponse.success(res, coupon, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public deactivateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const coupon = await this.service.deactivateCoupon(id, adminId);
      ApiResponse.success(res, coupon, 'Coupon deactivated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCouponUsage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const result = await this.service.getCouponUsage(id, req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Coupon usages retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
