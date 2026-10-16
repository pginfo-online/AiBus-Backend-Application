"use strict";
// ---------------------------------------------------------------------------
// Admin Notification Management — Service
// Notification logs, broadcast dispatching, template catalog, retry execution
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManagementService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
const queues_1 = require("../../../infrastructure/queues");
const constants_1 = require("../../../shared/constants");
class NotificationManagementService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-notification-management' });
    static getInstance() {
        if (!NotificationManagementService.instance) {
            NotificationManagementService.instance = new NotificationManagementService();
        }
        return NotificationManagementService.instance;
    }
    /**
     * List notifications with pagination and filters
     */
    async listNotifications(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
        if (query.channel) {
            where.channel = query.channel;
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.userId) {
            where.userId = query.userId;
        }
        if (query.bookingId) {
            where.bookingId = query.bookingId;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const orderBy = {};
        if (query.sortBy === 'sentAt') {
            orderBy.sentAt = query.sortOrder || 'desc';
        }
        else if (query.sortBy === 'status') {
            orderBy.status = query.sortOrder || 'desc';
        }
        else {
            orderBy.createdAt = query.sortOrder || 'desc';
        }
        const [total, notifications] = await Promise.all([
            prisma.notification.count({ where }),
            prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    booking: {
                        select: {
                            bookingNumber: true,
                            totalFare: true,
                            status: true,
                        },
                    },
                },
            }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            items: notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
    /**
     * Get notification details by ID
     */
    async getNotificationById(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const notification = await prisma.notification.findUnique({
            where: { id },
            include: {
                booking: true,
            },
        });
        if (!notification) {
            throw new errors_1.NotFoundError(`Notification with ID '${id}' not found`);
        }
        return notification;
    }
    /**
     * Send broadcast notification to users
     */
    async broadcastNotification(input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        let recipients = [];
        if (input.targetUserIds && input.targetUserIds.length > 0) {
            recipients = await prisma.user.findMany({
                where: { id: { in: input.targetUserIds }, status: client_1.UserStatus.ACTIVE },
                select: { id: true, email: true, phone: true },
            });
        }
        else if (input.targetRole) {
            recipients = await prisma.user.findMany({
                where: { role: input.targetRole, status: client_1.UserStatus.ACTIVE },
                select: { id: true, email: true, phone: true },
                take: 500, // Safe batch limit
            });
        }
        if (recipients.length === 0) {
            throw new errors_1.BadRequestError('No matching active recipients found for the broadcast criteria');
        }
        let queuedCount = 0;
        for (const recipient of recipients) {
            const destination = input.channel === 'EMAIL'
                ? recipient.email
                : recipient.phone || recipient.email;
            if (!destination)
                continue;
            const notification = await prisma.notification.create({
                data: {
                    userId: recipient.id,
                    channel: input.channel,
                    type: input.type || client_1.NotificationType.TRIP_REMINDER,
                    status: client_1.NotificationStatus.PENDING,
                    recipient: destination,
                    payload: {
                        title: input.title,
                        message: input.message,
                        broadcast: true,
                        adminId,
                    },
                },
            });
            try {
                const queueName = input.channel === 'SMS'
                    ? constants_1.QueueName.NOTIFICATION_SMS
                    : input.channel === 'PUSH'
                        ? constants_1.QueueName.NOTIFICATION_PUSH
                        : constants_1.QueueName.NOTIFICATION_EMAIL;
                await (0, queues_1.addJob)(queueName, 'broadcast-notification', {
                    notificationId: notification.id,
                    channel: input.channel,
                    recipient: destination,
                    title: input.title,
                    message: input.message,
                });
                queuedCount++;
            }
            catch (queueErr) {
                this.logger.warn({ queueErr, notificationId: notification.id }, 'Failed to enqueue broadcast notification');
            }
        }
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'BROADCAST_NOTIFICATION',
                module: 'notification-management',
                resourceType: 'notification',
                details: {
                    channel: input.channel,
                    title: input.title,
                    recipientsCount: queuedCount,
                },
            },
        });
        this.logger.info({ adminId, queuedCount, channel: input.channel }, 'Broadcast notifications dispatched');
        return { queuedCount };
    }
    /**
     * Retry a failed notification
     */
    async retryNotification(id, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const notification = await prisma.notification.findUnique({ where: { id } });
        if (!notification) {
            throw new errors_1.NotFoundError(`Notification with ID '${id}' not found`);
        }
        if (notification.status !== client_1.NotificationStatus.FAILED) {
            throw new errors_1.BadRequestError(`Cannot retry notification with status '${notification.status}'. Only FAILED notifications can be retried.`);
        }
        const updated = await prisma.notification.update({
            where: { id },
            data: {
                status: client_1.NotificationStatus.PENDING,
                retryCount: { increment: 1 },
            },
        });
        try {
            const queueName = updated.channel === 'SMS'
                ? constants_1.QueueName.NOTIFICATION_SMS
                : updated.channel === 'PUSH'
                    ? constants_1.QueueName.NOTIFICATION_PUSH
                    : constants_1.QueueName.NOTIFICATION_EMAIL;
            await (0, queues_1.addJob)(queueName, 'retry-notification', {
                notificationId: id,
                channel: updated.channel,
                recipient: updated.recipient,
                payload: updated.payload,
            });
        }
        catch (err) {
            this.logger.warn({ err, notificationId: id }, 'Failed to enqueue retry notification');
        }
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'RETRY_NOTIFICATION',
                module: 'notification-management',
                resourceType: 'notification',
                resourceId: id,
                details: { retryCount: updated.retryCount },
            },
        });
        this.logger.info({ notificationId: id, adminId }, 'Notification retry scheduled');
        return updated;
    }
    /**
     * Get available notification templates and metadata
     */
    getTemplates() {
        return [
            {
                id: 'BOOKING_CONFIRMATION',
                name: 'Booking Confirmation',
                channels: ['EMAIL', 'SMS', 'WHATSAPP'],
                placeholders: ['passengerName', 'bookingNumber', 'pnrNumber', 'source', 'destination', 'journeyDate', 'totalFare'],
            },
            {
                id: 'BOOKING_CANCELLATION',
                name: 'Booking Cancellation',
                channels: ['EMAIL', 'SMS', 'WHATSAPP'],
                placeholders: ['passengerName', 'bookingNumber', 'refundAmount', 'cancellationCharge'],
            },
            {
                id: 'REFUND_PROCESSED',
                name: 'Refund Completed',
                channels: ['EMAIL', 'SMS', 'WHATSAPP'],
                placeholders: ['passengerName', 'bookingNumber', 'refundAmount', 'refundDestination'],
            },
            {
                id: 'PAYMENT_REMINDER',
                name: 'Payment Reminder',
                channels: ['EMAIL', 'SMS'],
                placeholders: ['passengerName', 'bookingNumber', 'amount', 'expiresInMinutes'],
            },
            {
                id: 'TRIP_REMINDER',
                name: 'Upcoming Journey Reminder',
                channels: ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'],
                placeholders: ['passengerName', 'bookingNumber', 'boardingPoint', 'boardingTime', 'busNumber'],
            },
        ];
    }
}
exports.NotificationManagementService = NotificationManagementService;
//# sourceMappingURL=notification-management.service.js.map