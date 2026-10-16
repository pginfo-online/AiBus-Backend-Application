import { Request, Response, NextFunction } from 'express';
export declare class NotificationManagementController {
    private readonly service;
    listNotifications: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getNotificationById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    broadcastNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    retryNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTemplates: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
}
//# sourceMappingURL=notification-management.controller.d.ts.map