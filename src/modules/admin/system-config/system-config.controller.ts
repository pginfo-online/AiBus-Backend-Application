// ---------------------------------------------------------------------------
// Admin System Configuration — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { SystemConfigService } from './system-config.service';
import { ApiResponse } from '../../../shared/utils';

export class SystemConfigController {
  private readonly service = SystemConfigService.getInstance();

  public getConfigs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const group = req.query.group as string | undefined;
      const configs = await this.service.getConfigs(group);
      ApiResponse.success(res, configs, 'System configurations retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getConfigByKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.params.key as string;
      const config = await this.service.getConfigByKey(key);
      ApiResponse.success(res, config, 'System configuration retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const config = await this.service.createConfig(req.body, adminId);
      ApiResponse.created(res, config, 'System configuration created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const key = req.params.key as string;
      const config = await this.service.updateConfig(key, req.body, adminId);
      ApiResponse.success(res, config, 'System configuration updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public deleteConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const key = req.params.key as string;
      const result = await this.service.deleteConfig(key, adminId);
      ApiResponse.success(res, result, 'System configuration deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getFeatureFlags = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const flags = await this.service.getFeatureFlags();
      ApiResponse.success(res, flags, 'Feature flags retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const flag = await this.service.createFeatureFlag(req.body, adminId);
      ApiResponse.created(res, flag, 'Feature flag created successfully');
    } catch (error) {
      next(error);
    }
  };

  public toggleFeatureFlag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const key = req.params.key as string;
      const flag = await this.service.toggleFeatureFlag(key, req.body, adminId);
      ApiResponse.success(res, flag, 'Feature flag updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getDetailedSystemHealth = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const health = await this.service.getDetailedSystemHealth();
      ApiResponse.success(res, health, 'System diagnostics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
