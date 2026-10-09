import { Request, Response, NextFunction } from 'express';
import { TicketsService } from './tickets.service';
import { ApiResponse } from '../../shared/utils/response';

export class TicketsController {
  private ticketsService: TicketsService;

  constructor() {
    this.ticketsService = TicketsService.getInstance();
  }

  public getTicketByBookingId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
      const ticket = await this.ticketsService.getTicketByBookingId(bookingId);
      ApiResponse.success(res, ticket);
    } catch (error) {
      next(error);
    }
  };

  public getTicketByTicketNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ticketNumber = Array.isArray(req.params.ticketNumber) ? req.params.ticketNumber[0] : req.params.ticketNumber;
      const ticket = await this.ticketsService.getTicketByTicketNumber(ticketNumber);
      ApiResponse.success(res, ticket);
    } catch (error) {
      next(error);
    }
  };

  public getGdsBookingDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pnr = (req.query.PNR || req.query.pnr || req.query.PNRNo || req.query.pnrNo || req.body?.PNR || req.body?.pnr || req.body?.PNRNo || req.body?.pnrNo) as string;
      const ticketNo = (req.query.TicketNo || req.query.ticketNo || req.body?.TicketNo || req.body?.ticketNo) as string;

      if (!pnr || !ticketNo) {
        ApiResponse.error(res, 'PNR and TicketNo are required query parameters', 'VALIDATION_ERROR', 400);
        return;
      }

      const result = await this.ticketsService.getGdsBookingDetails(pnr, ticketNo);
      ApiResponse.success(res, result, 'Provider booking details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
