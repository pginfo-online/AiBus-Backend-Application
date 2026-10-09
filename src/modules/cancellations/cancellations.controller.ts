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

  public checkIsCancellableDirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticketNo = (req.query.TicketNo || req.query.ticketNo || req.body?.TicketNo || req.body?.ticketNo) as string;
      const seatNos = (req.query.seatNos || req.query.SeatNos || req.body?.seatNos || req.body?.SeatNos) as string;
      const pnrNo = (req.query.PNRNo || req.query.pnrNo || req.body?.PNRNo || req.body?.pnrNo) as string;

      if (!ticketNo || !seatNos) {
        ApiResponse.error(res, 'TicketNo and seatNos are required', 'VALIDATION_ERROR', 400);
        return;
      }

      const result = await this.cancellationsService.checkCancellabilityDirect({
        ticketNo,
        seatNos,
        pnrNo,
      });

      ApiResponse.success(res, result, result.Message || 'Cancellability details retrieved');
    } catch (error) {
      next(error);
    }
  };

  public cancelSeatsDirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticketNo = (req.body?.TicketNo || req.body?.ticketNo || req.query?.TicketNo || req.query?.ticketNo) as string;
      const seatNos = (req.body?.SeatNos || req.body?.seatNos || req.query?.SeatNos || req.query?.seatNos) as string;
      const pnr = (req.body?.PNR || req.body?.pnr || req.body?.PNRNo || req.body?.pnrNo || req.query?.PNR || req.query?.pnr) as string;

      if (!ticketNo || !seatNos) {
        ApiResponse.error(res, 'TicketNo and SeatNos are required in request body', 'VALIDATION_ERROR', 400);
        return;
      }

      const result = await this.cancellationsService.cancelSeatsDirect({
        TicketNo: ticketNo,
        SeatNos: Array.isArray(seatNos) ? seatNos.join(',') : seatNos,
        PNR: pnr,
      });

      ApiResponse.success(res, result, result.Message || 'Seats cancelled successfully');
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
      const userId = (req as any).user?.sub;

      const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId);
      ApiResponse.success(res, result, 'Booking cancelled and refund initiated');
    } catch (error) {
      next(error);
    }
  };
}
