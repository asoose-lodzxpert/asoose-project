import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { ExpoPushService } from '../libs/expo/expo-push.service';
import { FcmService } from '../libs/fcm/fcm.service';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private expoPushService: ExpoPushService,
    private fcmService: FcmService,
  ) { }

  /** Sends push notifications to a list of tokens based on their platform */
  private async sendToPushTokens(
    tokens: { token: string; platform: string }[],
    title: string,
    message: string,
    metadata?: any,
    type?: string,
  ) {
    if (!tokens.length) return;

    const expoTokens = tokens
      .filter(
        (t) =>
          t.platform === 'expo' ||
          t.token.startsWith('ExponentPushToken[') ||
          t.token.startsWith('ExpoPushToken['),
      )
      .map((t) => t.token);

    const fcmTokens = tokens
      .filter(
        (t) =>
          t.platform !== 'expo' &&
          !t.token.startsWith('ExponentPushToken[') &&
          !t.token.startsWith('ExpoPushToken['),
      )
      .map((t) => t.token);

    const channelId = type ? this.resolveChannelId(type) : 'default';

    const results: Promise<any>[] = [];

    if (expoTokens.length > 0) {
      results.push(
        this.expoPushService.sendToMultipleDevices(
          expoTokens,
          title,
          message,
          metadata,
          channelId,
        ).catch(err => this.logger.error('Expo push failed', err)),
      );
    }

    if (fcmTokens.length > 0) {
      results.push(
        this.fcmService.sendToDevices(
          fcmTokens,
          title,
          message,
          metadata,
        ).catch(err => this.logger.error('FCM push failed', err)),
      );
    }

    await Promise.all(results);
  }

  /** Map notification type to Android channel id */
  private resolveChannelId(type: string): string {
    const t = (type || 'SYSTEM').toUpperCase();
    if (t === 'ORDER') return 'orders';
    if (t === 'RIDE' || t === 'RIDE_UPDATE' || t === 'TRIP') return 'trip-updates';
    if (t === 'DELIVERY') return 'deliveries';
    if (t === 'PAYOUT' || t === 'PAYMENT') return 'payouts';
    if (t === 'JOB' || t === 'NEW_JOB' || t === 'NEW_RIDE' || t === 'RIDE_REQUESTED') return 'new-job';
    return 'default';
  }

  /**
   * ✅ ADAPTER METHOD: Fixes 'Property sendToUser does not exist' error
   * Maps the generic payload to the specific 'create' method structure
   */
  async sendToUser(userId: string, payload: NotificationPayload) {
    return this.create({
      userId,
      title: payload.title,
      message: payload.body,
      type: payload.type || 'SYSTEM',
      metadata: payload.data,
    });
  }

  /**
   * Create notification for a user (customer)
   */
  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    category?: string;
    metadata?: any;
  }) {
    if (!data.userId) {
      this.logger.warn('Skipping notification creation: userId is missing');
      return null;
    }
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Send real-time WebSocket notification
    this.notificationsGateway.sendToUser(data.userId, notification);

    // Broadcast high-priority events to admin room
    if (['ORDER', 'RIDE', 'DELIVERY'].includes(data.type?.toUpperCase())) {
      this.notificationsGateway.sendToAdminRoom(notification);
    }

    // Send push notification to all devices for this user
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { userId: data.userId },
        select: { token: true, platform: true },
      });

      await this.sendToPushTokens(
        tokens,
        data.title,
        data.message,
        data.metadata,
        data.type,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to user ${data.userId}:`,
        error,
      );
    }

    return notification;
  }

  /**
   * Create notification for a vendor
   */
  async createForVendor(data: {
    vendorId: string;
    title: string;
    message: string;
    type: string;
    category?: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        vendorId: data.vendorId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Send real-time WebSocket notification
    this.notificationsGateway.sendToVendor(data.vendorId, notification);

    // Broadcast high-priority events to admin room
    if (['ORDER', 'RIDE', 'DELIVERY'].includes(data.type?.toUpperCase())) {
      this.notificationsGateway.sendToAdminRoom(notification);
    }

    // Send push notification to all devices for this vendor
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { vendorId: data.vendorId },
        select: { token: true, platform: true },
      });

      await this.sendToPushTokens(
        tokens,
        data.title,
        data.message,
        data.metadata,
        data.type,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to vendor ${data.vendorId}:`,
        error,
      );
    }

    return notification;
  }

  /**
   * Create notification for a rider
   */
  async createForRider(data: {
    riderId: string;
    title: string;
    message: string;
    type: string;
    category?: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        riderId: data.riderId,
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Send real-time WebSocket notification
    this.notificationsGateway.sendToRider(data.riderId, notification);

    // Broadcast high-priority events to admin room
    if (['ORDER', 'RIDE', 'DELIVERY'].includes(data.type?.toUpperCase())) {
      this.notificationsGateway.sendToAdminRoom(notification);
    }

    // Send push notification to all devices for this rider
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { riderId: data.riderId },
        select: { token: true, platform: true },
      });

      await this.sendToPushTokens(
        tokens,
        data.title,
        data.message,
        data.metadata,
        data.type,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to rider ${data.riderId}:`,
        error,
      );
    }

    return notification;
  }

  /**
   * Create a system-level notification for admin consumption.
   * No userId / vendorId / riderId — these appear in the super-admin
   * notification feed which queries only by `type`.
   */
  async createForAdmin(data: {
    title: string;
    message: string;
    type: string;
    category?: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    // Broadcast to all connected admin WebSocket clients
    this.notificationsGateway.sendToAdminRoom(notification);

    // Send push notifications to all users with ADMIN/SUPER_ADMIN role
    try {
      const adminTokens = await this.prisma.pushToken.findMany({
        where: {
          user: {
            role: { in: ['ADMIN', 'SUPER_ADMIN'] },
            status: 'ACTIVE',
          },
        },
        select: { token: true, platform: true },
      });

      await this.sendToPushTokens(
        adminTokens,
        data.title,
        data.message,
        data.metadata,
        data.type,
      );
    } catch (error) {
      this.logger.error('Failed to send push notifications to admins:', error);
    }

    return notification;
  }

  /**
   * Get notifications for a user (customer)
   */
  async getUserNotifications(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: { total, page, pages: Math.ceil(total / take) },
    };
  }

  /**
   * Get notifications for a vendor
   */
  async getVendorNotifications(vendorId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { vendorId } }),
    ]);

    return {
      data,
      meta: { total, page, pages: Math.ceil(total / take) },
    };
  }

  /**
   * Get notifications for a rider
   */
  async getRiderNotifications(riderId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { riderId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { riderId } }),
    ]);

    return {
      data,
      meta: { total, page, pages: Math.ceil(total / take) },
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  /**
   * Get unread count for a vendor
   */
  async getVendorUnreadCount(vendorId: string) {
    const count = await this.prisma.notification.count({
      where: { vendorId, isRead: false },
    });
    return { count };
  }

  /**
   * Get unread count for a rider
   */
  async getRiderUnreadCount(riderId: string) {
    const count = await this.prisma.notification.count({
      where: { riderId, isRead: false },
    });
    return { count };
  }

  /**
   * Mark notification as read for a user
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark notification as read for a vendor
   */
  async markVendorAsRead(vendorId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, vendorId },
      data: { isRead: true },
    });
  }

  /**
   * Mark notification as read for a rider
   */
  async markRiderAsRead(riderId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, riderId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a vendor
   */
  async markAllVendorAsRead(vendorId: string) {
    return this.prisma.notification.updateMany({
      where: { vendorId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a rider
   */
  async markAllRiderAsRead(riderId: string) {
    return this.prisma.notification.updateMany({
      where: { riderId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}
