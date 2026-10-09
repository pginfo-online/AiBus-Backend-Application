// ---------------------------------------------------------------------------
// Admin Notification Management — Controller
// ---------------------------------------------------------------------------

import { Request, Response, NextFunction } from 'express';
import { NotificationManagementService } from './notification-management.service';
import { ApiResponse } from '../../../shared/utils';

export class NotificationManagementController {
  private readonly service = NotificationManagementService.getInstance();

  public listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listNotifications(req.query as any);
      ApiResponse.paginated(res, result.items, result.pagination, 'Notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notification = await this.service.getNotificationById(req.params.id as string);
      ApiResponse.success(res, notification, 'Notification details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public broadcastNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const result = await this.service.broadcastNotification(req.body, adminId);
      ApiResponse.created(res, result, 'Broadcast notifications enqueued successfully');
    } catch (error) {
      next(error);
    }
  };

  public retryNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.user!.sub;
      const result = await this.service.retryNotification(req.params.id as string, adminId);
      ApiResponse.success(res, result, 'Notification retry scheduled successfully');
    } catch (error) {
      next(error);
    }
  };

  public getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = this.service.getTemplates();
      ApiResponse.success(res, templates, 'Notification templates retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
