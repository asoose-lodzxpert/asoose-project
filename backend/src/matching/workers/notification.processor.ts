import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FcmService } from '../../libs/fcm/fcm.service';
import { ExpoPushService } from '../../libs/expo/expo-push.service';
import {
  JOB_TYPES,
  QUEUE_NAMES,
  SendPushNotificationJobData,
  SendSMSJobData,
} from '../queue/queue.constants';

@Processor(QUEUE_NAMES.NOTIFICATION, {
  concurrency: 10,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
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
    const { title, body, data: payload, fcmToken, expoPushToken } = data;

    const sent = { fcm: false, expo: false };

    // Try FCM token first
    if (fcmToken) {
      try {
        await this.fcmService.sendToDevice(fcmToken, title, body, payload);
        sent.fcm = true;
        this.logger.debug(`FCM notification sent: "${title}"`);
      } catch (err) {
        this.logger.error(`FCM send failed: ${err?.message}`, err?.stack);
      }
    }

    // Try Expo token
    if (expoPushToken) {
      try {
        await this.expoPushService.sendToDevice(
          expoPushToken,
          title,
          body,
          payload,
        );
        sent.expo = true;
        this.logger.debug(`Expo notification sent: "${title}"`);
      } catch (err) {
        this.logger.error(`Expo send failed: ${err?.message}`, err?.stack);
      }
    }

    if (!fcmToken && !expoPushToken) {
      this.logger.warn(`Notification job has no token — title: "${title}"`);
    }

    return sent;
  }

  private async handleSms(data: SendSMSJobData) {
    // Placeholder — wire up an SMS provider (e.g. Termii, Twilio) here
    this.logger.log(`SMS job received for ${data.phone}: ${data.message}`);
    return { queued: true };
  }
}
