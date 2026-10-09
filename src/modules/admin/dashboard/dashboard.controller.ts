// ---------------------------------------------------------------------------
// Admin Dashboard — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiResponse } from '../../../shared/utils/response';

export class DashboardController {
  private service: DashboardService;

  constructor() {
    this.service = DashboardService.getInstance();
  }

  public getOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getOverview(req.query as any);
      ApiResponse.success(res, result, 'Dashboard overview retrieved');
    } catch (error) {
      next(error);
    }
  };

  public getRevenueAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getRevenueAnalytics(req.query as any);
      ApiResponse.success(res, result, 'Revenue analytics retrieved');
    } catch (error) {
      next(error);
    }
  };

  public getBookingAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getBookingAnalytics(req.query as any);
      ApiResponse.success(res, result, 'Booking analytics retrieved');
    } catch (error) {
      next(error);
    }
  };

  public getUserAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getUserAnalytics(req.query as any);
      ApiResponse.success(res, result, 'User analytics retrieved');
    } catch (error) {
      next(error);
    }
  };

  public getSystemHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getSystemHealth();
      ApiResponse.success(res, result, 'System health retrieved');
    } catch (error) {
      next(error);
    }
  };
}
