import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FcmService } from '../libs/fcm/fcm.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationFacade {
  private readonly logger = new Logger(NotificationFacade.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue('email') private emailQueue: Queue,
    private readonly fcmService: FcmService,
    private readonly prisma: PrismaService,
  ) {}

  async sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    try {
      // 1. Persist
      const notification = await this.notificationsService.create({
        userId,
        title,
        message,
        type: metadata?.type || 'INFO',
        metadata,
      });

      // 2. WebSocket
      this.notificationsGateway.sendToUser(userId, {
        id: notification.id,
        title,
        message,
        type: notification.type,
        createdAt: notification.createdAt,
        metadata,
      });

      // 3. FCM Push Notification
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      if (user?.fcmToken) {
        await this.fcmService.sendToDevice(user.fcmToken, title, message, {
          ...metadata,
          notificationId: notification.id,
        });
      }

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}`,
        error.stack,
      );
    }
  }

  async sendEmail(to: string, subject: string, template: string, context: any) {
    try {
      // [!code ++] Actual Queue Logic
      await this.emailQueue.add(
        'send-email',
        { to, subject, template, context },
        { attempts: 3, removeOnComplete: true },
      );
      this.logger.log(`Email queued for ${to}: "${subject}"`);
    } catch (error) {
      this.logger.error(`Failed to queue email for ${to}`, error.stack);
    }
  }

  async sendToVendor(
    storeOwnerId: string,
    title: string,
    message: string,
    metadata?: any,
  ) {
    return this.sendInAppNotification(storeOwnerId, title, message, metadata);
  }

  async sendOrderNotifications(
    customerId: string,
    storeOwnerId: string,
    orderId: string,
    storeName: string,
    total: number,
    customerEmail: string,
    storeOwnerEmail: string,
    items: string[],
  ) {
    // Notify Customer
    await this.sendInAppNotification(
      customerId,
      'Order Placed',
      `Your order #${orderId.slice(0, 8).toUpperCase()} is pending acceptance.`,
      { orderId, type: 'ORDER_CREATED' },
    );
    await this.sendEmail(
      customerEmail,
      'Order Confirmation',
      'customer-order-placed',
      {
        name: 'Customer',
        orderId: orderId.slice(0, 8).toUpperCase(),
        storeName,
        total,
        items,
      },
    );

    // Notify Vendor
    await this.sendInAppNotification(
      storeOwnerId,
      'New Order Received',
      `You have a new order for ₦${total}.`,
      { orderId, type: 'ORDER_INCOMING' },
    );
    await this.sendEmail(
      storeOwnerEmail,
      'New Order Received',
      'vendor-new-order',
      {
        orderId: orderId.slice(0, 8).toUpperCase(),
        total,
        items,
      },
    );
  }

  async notifyRider(
    riderId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id: riderId },
        select: {
          fcmToken: true,
          expoPushToken: true,
          email: true,
          name: true,
        },
      });

      if (!rider) {
        this.logger.warn(`Cannot notify rider ${riderId}: record not found`);
        return;
      }

      if (rider.fcmToken) {
        await this.fcmService.sendToDevice(
          rider.fcmToken,
          title,
          message,
          metadata,
        );
      } else {
        this.logger.warn(
          `Rider ${riderId} has no FCM token configured; skipping push notification`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to notify rider ${riderId}`, error.stack);
    }
  }
}
