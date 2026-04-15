import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FcmService } from '../../libs/fcm/fcm.service';
import { ExpoPushService } from '../../libs/expo/expo-push.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JOB_TYPES,
  QUEUE_NAMES,
  SendPushNotificationJobData,
  SendSMSJobData,
} from '../queue/queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION, {
  concurrency: 20,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly expoPushService: ExpoPushService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case JOB_TYPES.SEND_PUSH_NOTIFICATION:
        return this.handlePushNotification(
          job.data as SendPushNotificationJobData,
        );
      case JOB_TYPES.SEND_SMS:
        return this.handleSms(job.data as SendSMSJobData);
      // order-notification jobs enqueued via enqueueOrderNotification / enqueueOrderNotificationBulk
      case 'order-notification':
        return this.handlePushNotification(
          job.data as SendPushNotificationJobData,
        );
      default:
        this.logger.warn(`Unknown notification job type: ${job.name}`);
        return null;
    }
  }

  private async handlePushNotification(data: SendPushNotificationJobData) {
    const { title, body, data: payload, userId, driverId, vendorId, fcmToken, expoPushToken } = data;

    const tokens: { token: string; platform: string }[] = [];

    // 1. Fetch tokens from database if IDs are provided
    if (userId || driverId || vendorId) {
      const where: any = {};
      if (userId) where.userId = userId;
      else if (driverId) where.riderId = driverId;
      else if (vendorId) where.vendorId = vendorId;

      const dbTokens = await this.prisma.pushToken.findMany({
        where,
        select: { token: true, platform: true },
      });
      tokens.push(...dbTokens);
    }

    // 2. Add individual tokens if provided (legacy/direct support)
    if (fcmToken && !tokens.some(t => t.token === fcmToken)) {
      tokens.push({ token: fcmToken, platform: 'fcm' });
    }
    if (expoPushToken && !tokens.some(t => t.token === expoPushToken)) {
      tokens.push({ token: expoPushToken, platform: 'expo' });
    }

    if (tokens.length === 0) {
      this.logger.warn(`Notification job has no tokens to target — title: "${title}"`);
      return { sent: 0 };
    }

    const channelId = this.resolveChannel(payload?.type || payload?.category || 'default');
    
    // 3. Send to tokens
    const expoTokens = tokens
      .filter(t => t.platform === 'expo' || t.token.startsWith('ExponentPushToken['))
      .map(t => t.token);
    const fcmTokens = tokens
      .filter(t => t.platform !== 'expo' && !t.token.startsWith('ExponentPushToken['))
      .map(t => t.token);

    let sentCount = 0;
    if (expoTokens.length > 0) {
      await this.expoPushService.sendToMultipleDevices(expoTokens, title, body, payload, channelId)
        .then(() => sentCount += expoTokens.length)
        .catch(err => this.logger.error(`Expo push failed: ${err.message}`));
    }

    if (fcmTokens.length > 0) {
      await this.fcmService.sendToDevices(fcmTokens, title, body, payload)
        .then(() => sentCount += fcmTokens.length)
        .catch(err => this.logger.error(`FCM push failed: ${err.message}`));
    }

    return { sent: sentCount, tokenCount: tokens.length };
  }

  private resolveChannel(type: string): string {
    const t = (type || '').toUpperCase();
    if (t === 'NEW_JOB' || t === 'JOB') return 'new-job';
    if (t === 'RIDE_UPDATE' || t === 'TRIP') return 'trip-updates';
    return 'default';
  }

  private async handleSms(data: SendSMSJobData) {
    // Placeholder — wire up an SMS provider (e.g. Termii, Twilio) here
    this.logger.log(`SMS job received for ${data.phone}: ${data.message}`);
    return { queued: true };
  }
}
