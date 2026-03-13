import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private expo: Expo;

  constructor() {
    this.expo = new Expo();
    this.logger.log('Expo Push Notification Service initialized');
  }

  /**
   * Send push notification to a single Expo token
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
    channelId?: string,
  ): Promise<boolean> {
    try {
      // Check that the token is valid
      if (!Expo.isExpoPushToken(token)) {
        this.logger.warn(`Invalid Expo push token: ${token}`);
        return false;
      }

      const message: ExpoPushMessage = {
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
        priority: 'high',
        channelId: channelId || 'default',
      };

      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error('Error sending push notification chunk:', error);
        }
      }

      // Check for errors in tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          this.logger.error(
            `Error sending push notification: ${ticket.message}`,
            ticket.details,
          );
          return false;
        }
      }

      this.logger.log(
        `Expo push notification sent successfully to ${token.substring(0, 20)}...`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send Expo push notification to ${token}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Send push notifications to multiple Expo tokens
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
    channelId?: string,
  ): Promise<{ success: number; failed: number }> {
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      this.logger.warn('No valid Expo push tokens provided');
      return { success: 0, failed: tokens.length };
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: channelId || 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failedCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);

        for (const ticket of ticketChunk) {
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            failedCount++;
            this.logger.error(
              `Error sending push notification: ${ticket.message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error('Error sending push notification chunk:', error);
        failedCount += chunk.length;
      }
    }

    this.logger.log(
      `Expo push notifications sent: ${successCount} succeeded, ${failedCount} failed`,
    );
    return { success: successCount, failed: failedCount };
  }

  /**
   * Validate if a token is a valid Expo push token
   */
  isValidToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }
}
