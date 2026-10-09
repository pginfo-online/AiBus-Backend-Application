// ---------------------------------------------------------------------------
// Admin Payment Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { PaymentManagementService } from './payment-management.service';
import { ApiResponse } from '../../../shared/utils/response';
import { sendAdminPaginated } from '../admin.utils';

export class PaymentManagementController {
  private service: PaymentManagementService;

  constructor() {
    this.service = PaymentManagementService.getInstance();
  }

  public listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { payments, pagination } = await this.service.listPayments(req.query as any);
      sendAdminPaginated(res, payments, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getPaymentDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payment = await this.service.getPaymentDetails(req.params.id as string);
      ApiResponse.success(res, payment);
    } catch (error) {
      next(error);
    }
  };

  public reconcilePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.reconcilePayment(req.params.id as string, req.user!.sub);
      ApiResponse.success(res, result, 'Reconciliation job queued');
    } catch (error) {
      next(error);
    }
  };

  public getPaymentStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.getPaymentStats();
      ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  };

  public getPaymentById = this.getPaymentDetails;
}
