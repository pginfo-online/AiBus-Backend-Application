import { Request, Response, NextFunction } from 'express';
import { CitiesService } from './cities.service';
import { ApiResponse } from '../../shared/utils/response';

export class CitiesController {
  private citiesService: CitiesService;

  constructor() {
    this.citiesService = CitiesService.getInstance();
  }

  public getCities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q : undefined;
      const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100) : undefined;
      const popular = req.query.popular === 'true' || req.query.popular === '1';
      const cities = await this.citiesService.getCities(query, limit, popular);
      ApiResponse.success(res, cities);
    } catch (error) {
      next(error);
    }
  };

  public syncCities = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const count = await this.citiesService.syncCities();
      ApiResponse.success(res, { count }, 'Cities synced successfully');
    } catch (error) {
      next(error);
    }
  };
}
