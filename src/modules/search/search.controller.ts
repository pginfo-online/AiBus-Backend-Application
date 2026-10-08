import { Request, Response, NextFunction } from 'express';
import { SearchService } from './search.service';
import { ApiResponse } from '../../shared/utils/response';

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = SearchService.getInstance();
  }

  public searchBuses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.searchService.searchBuses(req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public searchSingleBus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.searchService.searchSingleBus(req.query as any);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };
}
