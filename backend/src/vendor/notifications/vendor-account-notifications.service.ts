import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProducer } from '../../mail/email.producer';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferenceService } from '../../common/services/notification-preference.service';

/**
 * Vendor Account Status Notifications Service
 * Handles notifications for store suspension/activation, commission rate changes, and product updates
 */
@Injectable()
export class VendorAccountNotificationsService {
  private readonly logger = new Logger(VendorAccountNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private notificationsService: NotificationsService,
    private prefService: NotificationPreferenceService,
  ) {}

  /**
   * Notify vendor when their store is suspended or activated
   */
  async notifyStoreStatusChange(
    vendorId: string,
    storeId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE',
    reason?: string,
  ) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { id: true, email: true, name: true },
      });

      if (!vendor) return;

      // Check if vendor allows security alerts
      const allowNotification = await this.prefService.canNotifyVendor(
        vendorId,
        'security',
      );
      if (!allowNotification) return;

      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { name: true },
      });

      const statusMessage = {
        ACTIVE: 'activated',
        SUSPENDED: 'suspended',
        INACTIVE: 'deactivated',
      }[newStatus];

      const title = `Store ${statusMessage}`;
      const message =
        newStatus === 'SUSPENDED'
          ? `Your store "${store?.name}" has been ${statusMessage}.${reason ? ` Reason: ${reason}` : ''}`
          : `Your store "${store?.name}" has been ${statusMessage}. You can now resume operations.`;

      // Create in-app notification
      await this.notificationsService.createForVendor({
        vendorId,
        title,
        message,
        type: 'SECURITY',
        category: 'STORE_STATUS_CHANGED',
        metadata: {
          storeId,
          newStatus,
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification using template
      await this.emailProducer.sendVendorStoreStatusNotification(
        vendor.email,
        vendor.name,
        store?.name || 'Your Store',
        newStatus,
        reason ||
          `Your store has been ${newStatus === 'SUSPENDED' ? 'suspended' : statusMessage}.`,
      );

      this.logger.log(
        `Store status change notification sent to vendor ${vendorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send store status notification for vendor ${vendorId}:`,
        error,
      );
    }
  }

  /**
   * Notify vendor when commission rate changes
   */
  async notifyCommissionRateChange(
    vendorId: string,
    oldRate: number,
    newRate: number,
  ) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { id: true, email: true, name: true },
      });

      if (!vendor) return;

      // Check if vendor allows payment/business notifications
      const allowNotification = await this.prefService.canNotifyVendor(
        vendorId,
        'payments',
      );
      if (!allowNotification) return;

      const title = 'Commission Rate Updated';
      const message = `Your platform commission rate has been updated from ${oldRate}% to ${newRate}%`;

      // Create in-app notification
      await this.notificationsService.createForVendor({
        vendorId,
        title,
        message,
        type: 'SYSTEM',
        category: 'COMMISSION_RATE_CHANGED',
        metadata: {
          oldRate,
          newRate,
          effectiveDate: new Date().toISOString(),
        },
      });

      // Send email notification
      await this.emailProducer.sendVendorMessage(
        vendor.email,
        'Commission Rate Update',
        `Hello ${vendor.name},\n\nYour platform commission rate has been updated:\n\nOld Rate: ${oldRate}%\nNew Rate: ${newRate}%\n\nThis change is effective immediately for new orders.\n\nBest regards,\nThe Asoose Team`,
      );

      this.logger.log(
        `Commission rate change notification sent to vendor ${vendorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send commission rate notification for vendor ${vendorId}:`,
        error,
      );
    }
  }

  /**
   * Notify vendor when their product is approved or rejected
   */
  async notifyProductStatusChange(
    vendorId: string,
    productId: string,
    productName: string,
    newStatus: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { id: true, email: true, name: true },
      });

      if (!vendor) return;

      // Check if vendor allows business notifications
      const allowNotification = await this.prefService.canNotifyVendor(
        vendorId,
        'orders',
      );
      if (!allowNotification) return;

      const title = `Product ${newStatus}`;
      const message =
        newStatus === 'APPROVED'
          ? `Your product "${productName}" has been approved and is now live on the platform.`
          : `Your product "${productName}" has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

      // Create in-app notification
      await this.notificationsService.createForVendor({
        vendorId,
        title,
        message,
        type: 'SYSTEM',
        category: 'PRODUCT_STATUS_CHANGED',
        metadata: {
          productId,
          productName,
          newStatus,
          rejectionReason,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification using template
      await this.emailProducer.sendVendorProductStatusNotification(
        vendor.email,
        vendor.name,
        productName,
        newStatus === 'APPROVED' ? 'APPROVED' : 'DISABLED',
        rejectionReason,
      );

      this.logger.log(
        `Product status change notification sent to vendor ${vendorId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send product status notification for vendor ${vendorId}:`,
        error,
      );
    }
  }
}
