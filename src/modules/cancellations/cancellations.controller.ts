import { Request, Response, NextFunction } from 'express';
import { CancellationsService } from './cancellations.service';
import { ApiResponse } from '../../shared/utils/response';

export class CancellationsController {
  private cancellationsService: CancellationsService;

  constructor() {
    this.cancellationsService = CancellationsService.getInstance();
  }

  public checkCancellability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
      const seatNos = req.query.seatNos ? (req.query.seatNos as string).split(',') : undefined;
      const result = await this.cancellationsService.checkCancellability(bookingId, seatNos);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public cancelSeats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
      const { seatNos, reason } = req.body;
      const userId = (req as any).user?.sub;
      const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId);
      ApiResponse.success(res, result, 'Booking cancelled and refund initiated');
    } catch (error) {
      next(error);
    }
  };
}
