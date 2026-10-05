import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { ApiResponse } from '../../shared/utils/response';

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor() {
    this.paymentsService = PaymentsService.getInstance();
  }

  public createPaymentIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.sub;
      const result = await this.paymentsService.createPaymentIntent(req.body, userId);
      ApiResponse.created(res, result, 'Payment intent created');
    } catch (error) {
      next(error);
    }
  };

  public verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.paymentsService.verifyPayment(req.body);
      ApiResponse.success(res, result, 'Payment verified and booking confirmed');
    } catch (error) {
      next(error);
    }
  };

  public handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawBody = req.body.response;
      const xVerify = req.headers['x-verify'] as string | undefined;
      const result = await this.paymentsService.handleWebhook(rawBody, xVerify);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
