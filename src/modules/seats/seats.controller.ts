import { Request, Response, NextFunction } from 'express';
import { SeatsService } from './seats.service';
import { ApiResponse } from '../../shared/utils/response';

export class SeatsController {
  private seatsService: SeatsService;

  constructor() {
    this.seatsService = SeatsService.getInstance();
  }

  public getSeatChart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const busIdParam = Array.isArray(req.params.busId) ? req.params.busId[0] : req.params.busId;
      const busId = parseInt(busIdParam, 10);
      const fromCityId = req.query.fromCityId ? Number(req.query.fromCityId) : undefined;
      const toCityId = req.query.toCityId ? Number(req.query.toCityId) : undefined;
      const journeyDate = req.query.journeyDate ? String(req.query.journeyDate) : undefined;

      const chart = await this.seatsService.getSeatChart(busId, { fromCityId, toCityId, journeyDate });
      ApiResponse.success(res, chart);
    } catch (error) {
      next(error);
    }
  };
}
