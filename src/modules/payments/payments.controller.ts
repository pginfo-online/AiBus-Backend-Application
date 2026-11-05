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

  public payWithWallet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingId = req.body.bookingId;
      const agentId = (req as any).agentId;
      const userId = (req as any).user?.sub;
      const result = await this.paymentsService.payWithWallet(bookingId, agentId, userId);
      ApiResponse.success(res, result, 'Wallet payment successful and booking confirmed');
    } catch (error) {
      next(error);
    }
  };

  public verifyPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.paymentsService.verifyPayment(req.body, (req as any).user?.sub);
      ApiResponse.success(res, result, 'Payment verified and booking confirmed');
    } catch (error) {
      next(error);
    }
  };

  public handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawBody = (req as any).rawBody;
      const result = await this.paymentsService.handleRazorpayWebhook(rawBody, req.headers as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public handleRedirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantTxnId = (req.query.merchantOrderId || req.query.merchantTxnId || req.body?.merchantOrderId || req.body?.merchantTxnId || req.query.transactionId || '') as string;
      const bookingId = (req.query.bookingId || req.body?.bookingId || '') as string;
      const redirectUrlParam = (req.query.redirectUrl || req.body?.redirectUrl || '') as string;

      if (redirectUrlParam && (redirectUrlParam.startsWith('aibus://') || redirectUrlParam.startsWith('exp://'))) {
        const sep = redirectUrlParam.includes('?') ? '&' : '?';
        res.redirect(`${redirectUrlParam}${sep}merchantTxnId=${encodeURIComponent(merchantTxnId)}&bookingId=${encodeURIComponent(bookingId)}`);
        return;
      }

      const frontendUrl = `http://localhost:5173/payment-result?merchantTxnId=${encodeURIComponent(merchantTxnId)}&bookingId=${encodeURIComponent(bookingId)}`;
      res.redirect(frontendUrl);
    } catch (error) {
      next(error);
    }
  };

  public renderCheckoutPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const merchantTxnId = String(req.params.merchantTxnId || '');
      const redirectUrlParam = (req.query.redirectUrl as string) || undefined;
      const checkoutHtml = await this.paymentsService.generateCheckoutHtml(merchantTxnId, redirectUrlParam);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(checkoutHtml);
    } catch (error) {
      next(error);
    }
  };
}
