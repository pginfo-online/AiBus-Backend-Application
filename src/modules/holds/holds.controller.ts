import { Request, Response, NextFunction } from 'express';
import { HoldsService } from './holds.service';
import { ApiResponse } from '../../shared/utils/response';

export class HoldsController {
  private holdsService: HoldsService;

  constructor() {
    this.holdsService = HoldsService.getInstance();
  }

  public holdSeats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.sub;
      const result = await this.holdsService.holdSeats(req.body, userId);
      ApiResponse.created(res, result, 'Seats held successfully');
    } catch (error) {
      next(error);
    }
  };

  public getHold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const hold = await this.holdsService.getHold(id);
      if (!hold) {
        ApiResponse.error(res, 'Hold not found', 'NOT_FOUND', 404);
        return;
      }
      ApiResponse.success(res, hold);
    } catch (error) {
      next(error);
    }
  };
}
