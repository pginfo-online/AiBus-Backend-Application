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
      const result = await this.cancellationsService.checkCancellability(bookingId, seatNos, (req as any).user?.sub);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  public cancelSeats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
      const rawSeatNos = req.body?.seatNos || req.body?.SeatNos || req.body?.seats;
      const seatNos = Array.isArray(rawSeatNos)
        ? rawSeatNos
        : typeof rawSeatNos === 'string'
        ? rawSeatNos.split(',')
        : [];
      const reason = req.body?.reason;
      const refundToWallet = req.body?.refundToWallet === true;
      const userId = (req as any).user?.sub;

      const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId, refundToWallet);
      ApiResponse.success(res, result, 'Booking cancelled and refund processed');
    } catch (error) {
      next(error);
    }
  };
}
