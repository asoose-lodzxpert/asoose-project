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

      // 3. Push Notification — send to all available tokens in PushToken table
      const where: any = {};
      if (role === 'VENDOR') where.vendorId = recipientId;
      else if (role === 'RIDER') where.riderId = recipientId;
      else where.userId = recipientId;

      const tokens = await this.prisma.pushToken.findMany({ where });
      const pushMeta = { ...metadata, notificationId: notification.id };

      await this._sendPushToTokens(tokens, title, message, pushMeta, role);

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
      const tokens = await this.prisma.pushToken.findMany({
        where: { riderId },
        select: { token: true, platform: true },
      });

      if (tokens.length === 0) return;

      await this._sendPushToTokens(tokens, title, message, metadata, 'RIDER');
    } catch (error: any) {
      this.logger.error(`Failed to notify rider ${riderId}`, error.stack);
    }
  }

  private async _sendPushToTokens(
    tokens: { token: string; platform: string }[],
    title: string,
    message: string,
    metadata?: any,
    role: 'USER' | 'VENDOR' | 'RIDER' = 'USER',
  ) {
    const channelId = role === 'RIDER' ? (metadata?.type === 'NEW_JOB' ? 'new-job' : 'trip-updates') : 'default';

    for (const t of tokens) {
      const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[');
      try {
        if (isExpo) {
          await this.expoPushService.sendToDevice(t.token, title, message, metadata, channelId);
        } else {
          await this.fcmService.sendToDevice(t.token, title, message, metadata);
        }
      } catch (e) {
        this.logger.warn(`Push failed for token ${t.token}: ${e.message}`);
      }
    }
  }
}
