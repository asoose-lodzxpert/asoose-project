import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { FcmService } from '../libs/fcm/fcm.service';
import { ExpoPushService } from '../libs/expo/expo-push.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationFacade {
  private readonly logger = new Logger(NotificationFacade.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    @InjectQueue('email') private emailQueue: Queue,
    private readonly fcmService: FcmService,
    private readonly expoPushService: ExpoPushService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Unified notification sender (DB + Socket + FCM)
   */
  async sendInAppNotification(
    recipientId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
    role: 'USER' | 'VENDOR' | 'RIDER' = 'USER',
  ) {
    // Guard against undefined recipientId
    if (!recipientId) {
      this.logger.warn(
        `Notification skipped: recipientId is undefined (Role: ${role})`,
      );
      return;
    }

    try {
      // 1. Persist (Handle Schema Relationships)
      const createDto: any = {
        title,
        message,
        type: metadata?.type || 'INFO',
        metadata,
      };

      if (role === 'VENDOR') {
        createDto.vendorId = recipientId;
      } else if (role === 'RIDER') {
        createDto.riderId = recipientId;
      } else {
        createDto.userId = recipientId;
      }

      // NOTE: Ensure your NotificationsService handles the 'any' DTO correctly
      // or switches methods based on keys (userId vs vendorId).
      const notification = await this.notificationsService.create(createDto);

      // ✅ FIX: Check if notification was created before accessing properties
      if (!notification) {
        this.logger.warn(
          `Notification creation failed or skipped for ${role} ${recipientId}`,
        );
        return;
      }

      // 2. WebSocket
      this.notificationsGateway.sendToUser(recipientId, {
        id: notification.id,
        title,
        message,
        type: notification.type,
        createdAt: notification.createdAt,
        metadata,
      });

      // 3. Push Notification — send to all available channels (Expo + FCM)
      let expoToken: string | null | undefined = null;
      let fcmToken: string | null | undefined = null;

      if (role === 'VENDOR') {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: recipientId },
          select: { fcmToken: true, expoPushToken: true },
        });
        expoToken = vendor?.expoPushToken;
        fcmToken = vendor?.fcmToken;
      } else if (role === 'RIDER') {
        const rider = await this.prisma.rider.findUnique({
          where: { id: recipientId },
          select: { fcmToken: true, expoPushToken: true },
        });
        expoToken = rider?.expoPushToken;
        fcmToken = rider?.fcmToken;
      } else {
        const user = await this.prisma.user.findUnique({
          where: { id: recipientId },
          select: { fcmToken: true, expoPushToken: true },
        });
        expoToken = user?.expoPushToken;
        fcmToken = user?.fcmToken;
      }

      const pushMeta = { ...metadata, notificationId: notification.id };
      if (expoToken) {
        await this.expoPushService.sendToDevice(
          expoToken,
          title,
          message,
          pushMeta,
        );
      }
      if (fcmToken) {
        await this.fcmService.sendToDevice(fcmToken, title, message, pushMeta);
      }

      return notification;
    } catch (error: any) {
      this.logger.error(
        `Failed to send notification to ${role} ${recipientId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendEmail(to: string, subject: string, template: string, context: any) {
    if (!to) return;
    try {
      await this.emailQueue.add(
        'send-email',
        { to, subject, template, context },
        { attempts: 3, removeOnComplete: true },
      );
      this.logger.log(`Email queued for ${to}: "${subject}"`);
    } catch (error: any) {
      this.logger.error(`Failed to queue email for ${to}`, error.stack);
    }
  }

  async sendToVendor(
    storeOwnerId: string,
    title: string,
    message: string,
    metadata?: any,
  ) {
    if (!storeOwnerId) return;
    return this.sendInAppNotification(
      storeOwnerId,
      title,
      message,
      metadata,
      'VENDOR',
    );
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
    // Notify Customer (USER)
    if (customerId) {
      await this.sendInAppNotification(
        customerId,
        'Order Placed',
        `Your order #${orderId.slice(0, 8).toUpperCase()} is pending acceptance.`,
        { orderId, type: 'ORDER_CREATED' },
        'USER',
      );
    }

    if (customerEmail) {
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
    }

    // Notify Vendor (VENDOR)
    if (storeOwnerId) {
      await this.sendInAppNotification(
        storeOwnerId,
        'New Order Received',
        `You have a new order for ₦${total.toLocaleString()}.`,
        { orderId, type: 'ORDER_INCOMING' },
        'VENDOR',
      );
    }

    if (storeOwnerEmail) {
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
  }

  async notifyRider(
    riderId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    if (!riderId) return;
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

      // Send to both Expo and FCM channels if both are available
      if (rider.expoPushToken) {
        await this.expoPushService.sendToDevice(
          rider.expoPushToken,
          title,
          message,
          metadata,
        );
      }
      if (rider.fcmToken) {
        await this.fcmService.sendToDevice(
          rider.fcmToken,
          title,
          message,
          metadata,
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to notify rider ${riderId}`, error.stack);
    }
  }
}
