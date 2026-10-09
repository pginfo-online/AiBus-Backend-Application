// ---------------------------------------------------------------------------
// Admin Refund Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { RefundManagementService } from './refund-management.service';
import { ApiResponse } from '../../../shared/utils';

export class RefundManagementController {
  private readonly service = RefundManagementService.getInstance();

  public listRefunds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listRefunds(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Refunds retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getRefundById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const refund = await this.service.getRefundById(id);
      ApiResponse.success(res, refund, 'Refund details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public processRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const { notes } = req.body;
      const result = await this.service.processRefund(id, adminId, notes);
      ApiResponse.success(res, result, 'Refund processed successfully');
    } catch (error) {
      next(error);
    }
  };

  public retryRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const result = await this.service.retryRefund(id, adminId);
      ApiResponse.success(res, result, 'Refund retry scheduled successfully');
    } catch (error) {
      next(error);
    }
  };

  public getRefundStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.getRefundStats();
      ApiResponse.success(res, stats, 'Refund statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
