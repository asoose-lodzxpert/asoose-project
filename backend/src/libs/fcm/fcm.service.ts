import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length > 0) {
      this.logger.log('Firebase Admin already initialized');
      return;
    }

    const projectId = this.configService.get<string>('FCM_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FCM_PRIVATE_KEY');

    // Validate credentials
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.error('Firebase credentials missing in .env file');
      if (!projectId) this.logger.error('  ✗ FIREBASE_PROJECT_ID is missing');
      if (!clientEmail) this.logger.error('  ✗ FIREBASE_CLIENT_EMAIL is missing');
      if (!privateKey) this.logger.error('  ✗ FIREBASE_PRIVATE_KEY is missing');
      this.logger.warn('⚠️  Push notifications will NOT work until credentials are configured');
      return;
    }

    // Process the private key
    privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    // Initialize Firebase Admin
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      
      this.logger.log('✓ Firebase Admin initialized successfully');
      this.logger.log(`  - Project: ${projectId}`);
      
    } catch (error) {
      this.logger.error('Firebase initialization failed:', error.message);
      this.logger.warn('⚠️  Push notifications will NOT work');
      
      if (error.message.includes('Invalid PEM')) {
        this.logger.error('Check that FIREBASE_PRIVATE_KEY is complete and properly formatted');
      }
    }
  }

  /**
   * Send a push notification to a specific device
   */
  async sendToDevice(token: string, title: string, body: string, data?: Record<string, any>) {
    try {
      if (!token) {
        this.logger.warn('Cannot send notification: token is missing');
        return;
      }

      if (!admin.apps.length) {
        this.logger.error('Cannot send notification: Firebase Admin is not initialized');
        return;
      }

      const message = {
        token,
        notification: { title, body },
        data: this.formatData(data),
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
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

      const response = await admin.messaging().send(message);
      this.logger.log(`✓ Push notification sent (ID: ${response})`);
      
    } catch (error) {
      this.logger.error(`FCM Send Error: ${error.message}`);
      
      if (error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn('Token is no longer valid - consider removing from database');
      } else if (error.code === 'messaging/invalid-registration-token') {
        this.logger.error('Invalid token format');
      } else if (error.code === 'messaging/mismatched-credential') {
        this.logger.error('Firebase credentials do not match the app');
      }
    }
  }

  /**
   * Send to multiple devices (Multicast)
   */
  async sendToDevices(tokens: string[], title: string, body: string, data?: Record<string, any>) {
    if (!tokens.length) {
      this.logger.warn('Cannot send multicast: no tokens provided');
      return;
    }

    if (!admin.apps.length) {
      this.logger.error('Cannot send multicast: Firebase Admin is not initialized');
      return;
    }
    
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: this.formatData(data),
      });
      
      this.logger.log(`Multicast: ${response.successCount}/${tokens.length} successful, ${response.failureCount} failed`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.warn(`Failed token ${idx + 1}: ${resp.error?.code || 'Unknown error'}`);
          }
        });
      }
      
    } catch (error) {
      this.logger.error(`Multicast Error: ${error.message}`);
    }
  }

  private formatData(data: Record<string, any> | undefined): Record<string, string> {
    if (!data) return {};
    
    const formatted = {};
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined) {
        formatted[key] = String(data[key]);
      }
    }
    return formatted;
  }
}