// ---------------------------------------------------------------------------
// Admin Provider Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { ProviderManagementService } from './provider-management.service';
import { ApiResponse } from '../../../shared/utils';

export class ProviderManagementController {
  private readonly service = ProviderManagementService.getInstance();

  public getProviders = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const providers = await this.service.getProviders();
      ApiResponse.success(res, providers, 'Providers retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getProviderHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const name = req.params.name as string;
      const health = await this.service.getProviderHealth(name);
      ApiResponse.success(res, health, 'Provider health checked successfully');
    } catch (error) {
      next(error);
    }
  };

  public listTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listTransactions(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Provider transactions retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTransactionById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const transaction = await this.service.getTransactionById(id);
      ApiResponse.success(res, transaction, 'Provider transaction details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getProviderBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const name = req.params.name as string;
      const balance = await this.service.getProviderBalance(name);
      ApiResponse.success(res, balance, 'Provider balance retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
