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
      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.apps[0];
        this.logger.log('Firebase Admin SDK already initialized');
        return;
      }

      const fcmProjectId = this.configService.get<string>('FCM_PROJECT_ID');
      const fcmClientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');
      const fcmPrivateKey = this.configService.get<string>('FCM_PRIVATE_KEY');

      // Only initialize if credentials are provided
      if (!fcmProjectId || !fcmClientEmail || !fcmPrivateKey) {
        this.logger.warn(
          'FCM credentials not configured. Push notifications will be disabled.',
        );
        this.logger.warn(
          'Required env vars: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY',
        );
        return;
      }

      // Initialize Firebase Admin SDK with service account credentials
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: fcmProjectId,
          clientEmail: fcmClientEmail,
          // Replace escaped newlines with actual newlines
          privateKey: fcmPrivateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.logger.log(
        `Firebase Admin SDK initialized successfully for project: ${fcmProjectId}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.logger.error(
        'Please check your FCM credentials in environment variables',
      );
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
