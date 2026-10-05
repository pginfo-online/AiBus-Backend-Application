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
      const cities = await this.citiesService.getCities(query);
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
