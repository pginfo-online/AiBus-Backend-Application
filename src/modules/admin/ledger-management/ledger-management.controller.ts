import { Request, Response, NextFunction } from 'express';
import { LedgerManagementService } from './ledger-management.service';
import {
  ListLedgerQuery,
  ManualAdjustmentBody,
} from './ledger-management.validation';
import { ApiResponse } from '../../../shared/utils/response';

export class LedgerManagementController {
  private static instance: LedgerManagementController;
  private ledgerService: LedgerManagementService;

  private constructor() {
    this.ledgerService = LedgerManagementService.getInstance();
  }

  public static getInstance(): LedgerManagementController {
    if (!LedgerManagementController.instance) {
      LedgerManagementController.instance = new LedgerManagementController();
    }
    return LedgerManagementController.instance;
  }

  public listLedgerEntries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req as any).validatedQuery as ListLedgerQuery || req.query;
      const result = await this.ledgerService.listLedgerEntries(query);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public getReconciliationReport = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await this.ledgerService.getReconciliationReport();
      ApiResponse.success(res, report);
    } catch (error) {
      next(error);
    }
  };

  public createManualAdjustment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = (req as any).user?.sub || 'SYSTEM';
      const body = req.body as ManualAdjustmentBody;
      const result = await this.ledgerService.createManualAdjustment(adminId, body);
      ApiResponse.created(res, result, 'Manual ledger adjustment posted');
    } catch (error) {
      next(error);
    }
  };
}
