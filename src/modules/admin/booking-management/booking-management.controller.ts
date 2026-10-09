// ---------------------------------------------------------------------------
// Admin Booking Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { BookingManagementService } from './booking-management.service';
import { ApiResponse } from '../../../shared/utils/response';
import { sendAdminPaginated } from '../admin.utils';

export class BookingManagementController {
  private service: BookingManagementService;

  constructor() {
    this.service = BookingManagementService.getInstance();
  }

  public listBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookings, pagination } = await this.service.listBookings(req.query as any);
      sendAdminPaginated(res, bookings, pagination);
    } catch (error) {
      next(error);
    }
  };

  public getBookingDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const booking = await this.service.getBookingDetails(req.params.id as string);
      ApiResponse.success(res, booking);
    } catch (error) {
      next(error);
    }
  };

  public updateBookingStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const booking = await this.service.updateBookingStatus(
        req.params.id as string,
        req.body,
        req.user!.sub
      );
      ApiResponse.success(res, booking, 'Booking status updated');
    } catch (error) {
      next(error);
    }
  };

  public cancelBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const booking = await this.service.adminCancelBooking(
        req.params.id as string,
        req.body,
        req.user!.sub
      );
      ApiResponse.success(res, booking, 'Booking cancelled by admin');
    } catch (error) {
      next(error);
    }
  };

  public reconcileBooking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.reconcileBooking(req.params.id as string, req.user!.sub);
      ApiResponse.success(res, result, 'Reconciliation job queued');
    } catch (error) {
      next(error);
    }
  };

  public getBookingStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.service.getBookingStats();
      ApiResponse.success(res, stats);
    } catch (error) {
      next(error);
    }
  };

  public getBookingById = this.getBookingDetails;
  public overrideStatus = this.updateBookingStatus;
}
