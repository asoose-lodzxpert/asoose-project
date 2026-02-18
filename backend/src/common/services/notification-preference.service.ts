import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Notification Preference Service
 * Checks if an entity (user, vendor, rider) has enabled a specific type of notification
 */
@Injectable()
export class NotificationPreferenceService {
  private readonly logger = new Logger(NotificationPreferenceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if rider allows a specific notification type
   */
  async canNotifyRider(
    riderId: string,
    notificationType:
      | 'securityAlerts'
      | 'newOrders'
      | 'orderUpdates'
      | 'paymentUpdates'
      | 'all',
  ): Promise<boolean> {
    try {
      const settings = await this.prisma.riderNotificationSettings.findUnique({
        where: { riderId },
      });

      if (!settings) return true; // Default to allowed if no settings exist

      if (!settings.masterEnabled) return false;

      if (notificationType === 'all') return true;

      return settings[notificationType] ?? true;
    } catch (error) {
      this.logger.error(
        `Failed to check rider notification preferences for ${riderId}:`,
        error,
      );
      return true; // Default to allowed on error
    }
  }

  /**
   * Check if vendor allows a specific notification type (uses JSON field)
   */
  async canNotifyVendor(
    vendorId: string,
    notificationType:
      | 'email'
      | 'push'
      | 'security'
      | 'payments'
      | 'orders'
      | 'all' = 'all',
  ): Promise<boolean> {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { notificationsPreferences: true },
      });

      if (!vendor?.notificationsPreferences) return true; // Default to allowed

      const prefs = vendor.notificationsPreferences as Record<string, boolean>;

      if (prefs.masterEnabled === false) return false;

      if (notificationType === 'all') return true;

      return prefs[notificationType] ?? true;
    } catch (error) {
      this.logger.error(
        `Failed to check vendor notification preferences for ${vendorId}:`,
        error,
      );
      return true; // Default to allowed on error
    }
  }

  /**
   * Check if user allows a specific notification type
   */
  async canNotifyUser(
    userId: string,
    notificationType:
      | 'email'
      | 'push'
      | 'security'
      | 'orders'
      | 'payments'
      | 'all' = 'all',
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationsPreferences: true },
      });

      if (!user?.notificationsPreferences) return true; // Default to allowed

      const prefs = user.notificationsPreferences as Record<string, boolean>;

      if (prefs.masterEnabled === false) return false;

      if (notificationType === 'all') return true;

      return prefs[notificationType] ?? true;
    } catch (error) {
      this.logger.error(
        `Failed to check user notification preferences for ${userId}:`,
        error,
      );
      return true; // Default to allowed on error
    }
  }
}
