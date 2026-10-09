// ---------------------------------------------------------------------------
// Admin City Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { CityManagementService } from './city-management.service';
import { ApiResponse } from '../../../shared/utils';

export class CityManagementController {
  private readonly service = CityManagementService.getInstance();

  public listCities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listCities(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Cities retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCityById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const city = await this.service.getCityById(id);
      ApiResponse.success(res, city, 'City details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public createCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const city = await this.service.createCity(req.body, adminId);
      ApiResponse.created(res, city, 'City created successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const city = await this.service.updateCity(id, req.body, adminId);
      ApiResponse.success(res, city, 'City updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public deactivateCity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const id = req.params.id as string;
      const city = await this.service.deactivateCity(id, adminId);
      ApiResponse.success(res, city, 'City deactivated successfully');
    } catch (error) {
      next(error);
    }
  };

  public syncCities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const result = await this.service.syncCities(adminId);
      ApiResponse.success(res, result, 'Cities synced from provider successfully');
    } catch (error) {
      next(error);
    }
  };
}
