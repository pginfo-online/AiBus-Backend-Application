import { Request, Response, NextFunction } from 'express';
import { PaymentGatewayAdminService } from './payment-gateways.service';
import { updateGatewayConfigSchema, toggleGatewaySchema } from './payment-gateways.validation';
import { ApiResponse } from '../../../shared/utils/response';

export class PaymentGatewayAdminController {
  private service: PaymentGatewayAdminService;

  constructor() {
    this.service = PaymentGatewayAdminService.getInstance();
  }

  public listGateways = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateways = await this.service.listGateways();
      ApiResponse.success(res, { gateways }, 'Payment gateways retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateGateway = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateway = req.params.gateway as string;
      const validated = updateGatewayConfigSchema.parse(req.body);
      const adminId = (req as any).admin?.id || (req as any).user?.sub;
      const updated = await this.service.updateGateway(gateway, validated, adminId);
      ApiResponse.success(res, { gateway: updated }, 'Payment gateway configuration updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public toggleGateway = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gateway = req.params.gateway as string;
      const validated = toggleGatewaySchema.parse(req.body);
      const adminId = (req as any).admin?.id || (req as any).user?.sub;
      const updated = await this.service.toggleGateway(gateway, validated, adminId);
      ApiResponse.success(res, { gateway: updated }, `Payment gateway ${validated.isEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      next(error);
    }
  };

  public getGatewayMetrics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const metrics = await this.service.getGatewayMetrics();
      ApiResponse.success(res, metrics, 'Payment gateway metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
