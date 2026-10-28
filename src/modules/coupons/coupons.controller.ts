import { Request, Response, NextFunction } from 'express';
import { CouponsService } from './coupons.service';
import { ApiResponse } from '../../shared/utils/response';

export class CouponsController {
  private service: CouponsService;

  constructor() {
    this.service = CouponsService.getInstance();
  }

  public listCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      const type = req.query.type as any;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await this.service.listActiveCoupons({ category, type, page, limit });
      ApiResponse.paginated(res, result.items, {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasNextPage: page * limit < result.total,
        hasPrevPage: page > 1,
      });
    } catch (error) {
      next(error);
    }
  };

  public getCouponByCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = String(req.params.code);
      const coupon = await this.service.getCouponByCode(code);
      ApiResponse.success(res, coupon, 'Coupon retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      const result = await this.service.validateCoupon({
        ...req.body,
        userId,
      });
      ApiResponse.success(res, result, 'Coupon validated successfully');
    } catch (error) {
      next(error);
    }
  };
}
