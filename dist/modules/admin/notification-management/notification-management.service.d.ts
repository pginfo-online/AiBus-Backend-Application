import { PaginatedResult } from '../admin.utils';
import { ListNotificationsQuery, BroadcastNotificationInput } from './notification-management.validation';
export declare class NotificationManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): NotificationManagementService;
    /**
     * List notifications with pagination and filters
     */
    listNotifications(query: ListNotificationsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get notification details by ID
     */
    getNotificationById(id: string): Promise<any>;
    /**
     * Send broadcast notification to users
     */
    broadcastNotification(input: BroadcastNotificationInput, adminId: string): Promise<{
        queuedCount: number;
    }>;
    /**
     * Retry a failed notification
     */
    retryNotification(id: string, adminId: string): Promise<any>;
    /**
     * Get available notification templates and metadata
     */
    getTemplates(): any;
}
//# sourceMappingURL=notification-management.service.d.ts.map