import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProducer } from '../../mail/email.producer';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferenceService } from '../../common/services/notification-preference.service';

/**
 * Rider Account Status Notifications Service
 * Handles notifications for account suspension/activation and document verification results
 */
@Injectable()
export class RiderAccountNotificationsService {
  private readonly logger = new Logger(RiderAccountNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private notificationsService: NotificationsService,
    private prefService: NotificationPreferenceService,
  ) {}

  /**
   * Notify rider when their account status changes (suspended, activated, banned, etc.)
   */
  async notifyAccountStatusChange(
    riderId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE',
    reason?: string,
  ) {
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id: riderId },
        select: { id: true, email: true, name: true },
      });

      if (!rider) return;

      // Check if rider allows security alerts
      const allowNotification = await this.prefService.canNotifyRider(
        riderId,
        'securityAlerts',
      );
      if (!allowNotification) return;

      const statusMessage = {
        ACTIVE: 'activated',
        SUSPENDED: 'suspended',
        BANNED: 'banned',
        INACTIVE: 'deactivated',
      }[newStatus];

      const title = `Account ${statusMessage}`;
      const message =
        newStatus === 'ACTIVE'
          ? `Your account has been ${statusMessage}. You can now accept rides and deliveries.`
          : `Your account has been ${statusMessage}.${reason ? ` Reason: ${reason}` : ''}`;

      // Create in-app notification
      await this.notificationsService.createForRider({
        riderId,
        title,
        message,
        type: 'SECURITY',
        category: 'ACCOUNT_STATUS_CHANGED',
        metadata: {
          newStatus,
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification using template
      await this.emailProducer.sendRiderAccountStatusNotification(
        rider.email,
        rider.name,
        newStatus,
        reason || `Your account has been ${statusMessage}.`,
      );

      this.logger.log(
        `Account status change notification sent to rider ${riderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send account status notification for rider ${riderId}:`,
        error,
      );
    }
  }

  /**
   * Notify rider when their document verification result is ready (approved or rejected)
   */
  async notifyDocumentVerificationResult(
    riderId: string,
    documentType: string,
    status: 'VERIFIED' | 'REJECTED' | 'PENDING',
    rejectionReason?: string,
  ) {
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id: riderId },
        select: { id: true, email: true, name: true },
      });

      if (!rider) return;

      // Check if rider allows security alerts
      const allowNotification = await this.prefService.canNotifyRider(
        riderId,
        'securityAlerts',
      );
      if (!allowNotification) return;

      const statusMessage = {
        VERIFIED: 'has been verified',
        REJECTED: 'has been rejected',
        PENDING: 'is under review',
      }[status];

      const title = `Document Verification: ${documentType}`;
      const message =
        status === 'VERIFIED'
          ? `Your ${documentType} ${statusMessage}. Thank you for providing the necessary documentation.`
          : status === 'REJECTED'
            ? `Your ${documentType} ${statusMessage}.${rejectionReason ? ` Reason: ${rejectionReason}` : ''} Please resubmit with the required changes.`
            : `Your ${documentType} ${statusMessage}. We'll notify you once the review is complete.`;

      // Create in-app notification
      await this.notificationsService.createForRider({
        riderId,
        title,
        message,
        type: 'SECURITY',
        category: 'DOCUMENT_VERIFICATION_RESULT',
        metadata: {
          documentType,
          status,
          rejectionReason,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification using template
      await this.emailProducer.sendRiderDocumentVerificationNotification(
        rider.email,
        rider.name,
        documentType,
        status,
        rejectionReason,
      );

      this.logger.log(
        `Document verification notification sent to rider ${riderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send document verification notification for rider ${riderId}:`,
        error,
      );
    }
  }
}
