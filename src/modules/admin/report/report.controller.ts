// ---------------------------------------------------------------------------
// Admin Report Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import { ApiResponse } from '../../../shared/utils';
import { sendCsvResponse } from '../admin.utils';

export class ReportController {
  private readonly service = ReportService.getInstance();

  public getRevenueReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const data = await this.service.getRevenueReport(query);

      if (query.format === 'csv') {
        const headers = ['bookingNumber', 'operatorName', 'baseFare', 'serviceTax', 'convenienceFee', 'discountAmount', 'totalFare', 'date'];
        sendCsvResponse(res, `revenue-report-${Date.now()}.csv`, headers, data);
        return;
      }

      ApiResponse.success(res, data, 'Revenue report generated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getBookingReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const data = await this.service.getBookingReport(query);

      if (query.format === 'csv') {
        const headers = ['bookingNumber', 'pnrNumber', 'route', 'journeyDate', 'operatorName', 'busType', 'totalFare', 'status', 'passengerName', 'passengerPhone', 'bookedAt'];
        sendCsvResponse(res, `booking-report-${Date.now()}.csv`, headers, data);
        return;
      }

      ApiResponse.success(res, data, 'Booking report generated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getUserReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const data = await this.service.getUserReport(query);

      if (query.format === 'csv') {
        const headers = ['id', 'name', 'email', 'phone', 'role', 'status', 'totalBookings', 'registeredAt'];
        sendCsvResponse(res, `user-report-${Date.now()}.csv`, headers, data);
        return;
      }

      ApiResponse.success(res, data, 'User report generated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getCancellationReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const data = await this.service.getCancellationReport(query);

      if (query.format === 'csv') {
        const headers = ['id', 'bookingNumber', 'operatorName', 'seatNumbers', 'totalFare', 'cancellationCharge', 'refundAmount', 'status', 'cancelledAt'];
        sendCsvResponse(res, `cancellation-report-${Date.now()}.csv`, headers, data);
        return;
      }

      ApiResponse.success(res, data, 'Cancellation report generated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getPaymentReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as any;
      const data = await this.service.getPaymentReport(query);

      if (query.format === 'csv') {
        const headers = ['id', 'bookingNumber', 'merchantTxnId', 'gatewayOrderId', 'gateway', 'amount', 'status', 'webhookVerified', 'createdAt'];
        sendCsvResponse(res, `payment-report-${Date.now()}.csv`, headers, data);
        return;
      }

      ApiResponse.success(res, data, 'Payment report generated successfully');
    } catch (error) {
      next(error);
    }
  };
}
