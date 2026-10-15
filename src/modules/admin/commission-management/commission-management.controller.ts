import { Request, Response, NextFunction } from 'express';
import { CommissionManagementService } from './commission-management.service';
import {
  ListCommissionRulesQuery,
  CreateCommissionRuleBody,
  UpdateCommissionRuleBody,
} from './commission-management.validation';
import { ApiResponse } from '../../../shared/utils/response';

export class CommissionManagementController {
  private static instance: CommissionManagementController;
  private commissionService: CommissionManagementService;

  private constructor() {
    this.commissionService = CommissionManagementService.getInstance();
  }

  public static getInstance(): CommissionManagementController {
    if (!CommissionManagementController.instance) {
      CommissionManagementController.instance = new CommissionManagementController();
    }
    return CommissionManagementController.instance;
  }

  public listRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req as any).validatedQuery as ListCommissionRulesQuery || req.query;
      const result = await this.commissionService.listRules(query);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public createRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = (req as any).user?.sub || 'SYSTEM';
      const body = req.body as CreateCommissionRuleBody;
      const result = await this.commissionService.createRule(adminId, body);
      ApiResponse.created(res, result, 'Commission rule created');
    } catch (error) {
      next(error);
    }
  };

  public updateRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ruleId = String(req.params.ruleId);
      const body = req.body as UpdateCommissionRuleBody;
      const result = await this.commissionService.updateRule(ruleId, body);
      ApiResponse.success(res, result, 'Commission rule updated');
    } catch (error) {
      next(error);
    }
  };

  public toggleRuleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ruleId = String(req.params.ruleId);
      const result = await this.commissionService.toggleRuleStatus(ruleId);
      ApiResponse.success(res, result, `Commission rule status updated to ${result.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    } catch (error) {
      next(error);
    }
  };

  public deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ruleId = String(req.params.ruleId);
      await this.commissionService.deleteRule(ruleId);
      ApiResponse.success(res, null, 'Commission rule deleted');
    } catch (error) {
      next(error);
    }
  };
}
