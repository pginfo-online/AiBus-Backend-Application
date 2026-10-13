"use strict";
// ---------------------------------------------------------------------------
// Admin Notification Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManagementController = void 0;
const notification_management_service_1 = require("./notification-management.service");
const utils_1 = require("../../../shared/utils");
class NotificationManagementController {
    service = notification_management_service_1.NotificationManagementService.getInstance();
    listNotifications = async (req, res, next) => {
        try {
            const result = await this.service.listNotifications(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Notifications retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getNotificationById = async (req, res, next) => {
        try {
            const notification = await this.service.getNotificationById(req.params.id);
            utils_1.ApiResponse.success(res, notification, 'Notification details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    broadcastNotification = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const result = await this.service.broadcastNotification(req.body, adminId);
            utils_1.ApiResponse.created(res, result, 'Broadcast notifications enqueued successfully');
        }
        catch (error) {
            next(error);
        }
    };
    retryNotification = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const result = await this.service.retryNotification(req.params.id, adminId);
            utils_1.ApiResponse.success(res, result, 'Notification retry scheduled successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getTemplates = async (_req, res, next) => {
        try {
            const templates = this.service.getTemplates();
            utils_1.ApiResponse.success(res, templates, 'Notification templates retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.NotificationManagementController = NotificationManagementController;
//# sourceMappingURL=notification-management.controller.js.map