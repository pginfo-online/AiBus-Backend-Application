// ---------------------------------------------------------------------------
// Admin Notification Management — Service
// Notification logs, broadcast dispatching, template catalog, retry execution
// ---------------------------------------------------------------------------

import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { buildPagination, buildDateFilter, PaginatedResult } from '../admin.utils';
import { addJob } from '../../../infrastructure/queues';
import { QueueName } from '../../../shared/constants';
import {
  ListNotificationsQuery,
  BroadcastNotificationInput,
} from './notification-management.validation';

export class NotificationManagementService {
  private static instance: NotificationManagementService;
  private readonly logger = logger.child({ module: 'admin-notification-management' });

  public static getInstance(): NotificationManagementService {
    if (!NotificationManagementService.instance) {
      NotificationManagementService.instance = new NotificationManagementService();
    }
    return NotificationManagementService.instance;
  }

  /**
   * List notifications with pagination and filters
   */
  public async listNotifications(query: ListNotificationsQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

    if (query.channel) {
      where.channel = query.channel as NotificationChannel;
    }

    if (query.type) {
      where.type = query.type as NotificationType;
    }

    if (query.status) {
      where.status = query.status as NotificationStatus;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.bookingId) {
      where.bookingId = query.bookingId;
    }

    const dateFilter = buildDateFilter(query.startDate, query.endDate, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    const orderBy: any = {};
    if (query.sortBy === 'sentAt') {
      orderBy.sentAt = query.sortOrder || 'desc';
    } else if (query.sortBy === 'status') {
      orderBy.status = query.sortOrder || 'desc';
    } else {
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
  public async getNotificationById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        booking: true,
      },
    });

    if (!notification) {
      throw new NotFoundError(`Notification with ID '${id}' not found`);
    }

    return notification;
  }

  /**
   * Send broadcast notification to users
   */
  public async broadcastNotification(
    input: BroadcastNotificationInput,
    adminId: string
  ): Promise<{ queuedCount: number }> {
    const prisma = getPrismaClient();

    let recipients: Array<{ id: string; email: string; phone: string | null }> = [];

    if (input.targetUserIds && input.targetUserIds.length > 0) {
      recipients = await prisma.user.findMany({
        where: { id: { in: input.targetUserIds }, status: UserStatus.ACTIVE },
        select: { id: true, email: true, phone: true },
      });
    } else if (input.targetRole) {
      recipients = await prisma.user.findMany({
        where: { role: input.targetRole as UserRole, status: UserStatus.ACTIVE },
        select: { id: true, email: true, phone: true },
        take: 500, // Safe batch limit
      });
    }

    if (recipients.length === 0) {
      throw new BadRequestError('No matching active recipients found for the broadcast criteria');
    }

    let queuedCount = 0;

    for (const recipient of recipients) {
      const destination =
        input.channel === 'EMAIL'
          ? recipient.email
          : recipient.phone || recipient.email;

      if (!destination) continue;

      const notification = await prisma.notification.create({
        data: {
          userId: recipient.id,
          channel: input.channel as NotificationChannel,
          type: (input.type as NotificationType) || NotificationType.TRIP_REMINDER,
          status: NotificationStatus.PENDING,
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
        const queueName =
          input.channel === 'SMS'
            ? QueueName.NOTIFICATION_SMS
            : input.channel === 'PUSH'
            ? QueueName.NOTIFICATION_PUSH
            : QueueName.NOTIFICATION_EMAIL;
        await addJob(queueName, 'broadcast-notification', {
          notificationId: notification.id,
          channel: input.channel,
          recipient: destination,
          title: input.title,
          message: input.message,
        });
        queuedCount++;
      } catch (queueErr) {
        this.logger.warn(
          { queueErr, notificationId: notification.id },
          'Failed to enqueue broadcast notification'
        );
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
  public async retryNotification(id: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundError(`Notification with ID '${id}' not found`);
    }

    if (notification.status !== NotificationStatus.FAILED) {
      throw new BadRequestError(
        `Cannot retry notification with status '${notification.status}'. Only FAILED notifications can be retried.`
      );
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.PENDING,
        retryCount: { increment: 1 },
      },
    });

    try {
      const queueName =
        updated.channel === 'SMS'
          ? QueueName.NOTIFICATION_SMS
          : updated.channel === 'PUSH'
          ? QueueName.NOTIFICATION_PUSH
          : QueueName.NOTIFICATION_EMAIL;
      await addJob(queueName, 'retry-notification', {
        notificationId: id,
        channel: updated.channel,
        recipient: updated.recipient,
        payload: updated.payload,
      });
    } catch (err) {
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
  public getTemplates(): any {
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
