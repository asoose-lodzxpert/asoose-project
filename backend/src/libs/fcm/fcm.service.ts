import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');
      const fcmProjectId = this.configService.get<string>('FCM_PROJECT_ID');

      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.apps[0];
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      }

      // Only initialize if credentials are provided
      if (!fcmServerKey || !fcmProjectId) {
        this.logger.warn(
          'FCM credentials not configured. Push notifications will be disabled.',
        );
        return;
      }

      // Initialize Firebase Admin SDK
      // Note: For production, use service account JSON file instead of server key
      // For now, we'll just log that FCM is configured
      this.logger.log(
        'FCM configured with project ID: ' +
          fcmProjectId.substring(0, 10) +
          '...',
      );

      // TODO: Initialize with service account for production
      // this.firebaseApp = admin.initializeApp({
      //   credential: admin.credential.cert({
      //     projectId: fcmProjectId,
      //     clientEmail: process.env.FCM_CLIENT_EMAIL,
      //     privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      //   }),
      // });

      this.logger.log(
        'FCM Service initialized (mock mode - add credentials for production)',
      );
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
    }
  }

  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn(
          'Firebase not initialized. Skipping push notification.',
        );
        return false;
      }

      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(
        `Push notification sent to device: ${token.substring(0, 20)}...`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to ${token.substring(0, 20)}...:`,
        error.message,
      );
      return false;
    }
  }

  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.firebaseApp) {
      this.logger.warn(
        'Firebase not initialized. Skipping push notifications.',
      );
      return { successCount: 0, failureCount: tokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(
        'Failed to send multicast push notification:',
        error.message,
      );
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn(
          'Firebase not initialized. Skipping push notification.',
        );
        return false;
      }

      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(`Push notification sent to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to topic ${topic}:`,
        error.message,
      );
      return false;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn(
          'Firebase not initialized. Cannot subscribe to topic.',
        );
        return;
      }

      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`${tokens.length} tokens subscribed to topic: ${topic}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to topic ${topic}:`,
        error.message,
      );
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      if (!this.firebaseApp) {
        this.logger.warn(
          'Firebase not initialized. Cannot unsubscribe from topic.',
        );
        return;
      }

      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(
        `${tokens.length} tokens unsubscribed from topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from topic ${topic}:`,
        error.message,
      );
    }
  }
}
