import { Request, Response, NextFunction } from 'express';
import { BookingsService } from './bookings.service';
import { ApiResponse } from '../../shared/utils/response';

export class BookingsController {
  private bookingsService: BookingsService;

  constructor() {
    this.bookingsService = BookingsService.getInstance();
  }

  public createBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.sub;
      const booking = await this.bookingsService.createBooking(req.body, userId);
      ApiResponse.created(res, booking, 'Booking initiated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const booking = await this.bookingsService.getBooking(id);
      ApiResponse.success(res, booking);
    } catch (error) {
      next(error);
    }
  };

  public getUserBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user.sub;
      const bookings = await this.bookingsService.getUserBookings(userId);
      ApiResponse.success(res, bookings);
    } catch (error) {
      next(error);
    }
  };
}
