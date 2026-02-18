import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProducer } from '../../mail/email.producer';
import { NotificationsService } from '../../notifications/notifications.service';

export interface SecurityEventData {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  device?: string;
  timestamp?: Date;
  metadata?: any;
}

@Injectable()
export class VendorSecurityNotificationsService {
  private readonly logger = new Logger(VendorSecurityNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Send notification when vendor logs in
   */
  async notifyLogin(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    eventData?: SecurityEventData,
  ) {
    const timestamp = eventData?.timestamp || new Date();
    const device = eventData?.device || 'Unknown device';
    const location = eventData?.location || 'Unknown location';

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'New Login Detected',
      message: `You logged in from ${device} at ${timestamp.toLocaleString()}`,
      type: 'SECURITY',
      category: 'LOGIN',
      metadata: {
        ipAddress: eventData?.ipAddress,
        userAgent: eventData?.userAgent,
        location,
        device,
        timestamp: timestamp.toISOString(),
      },
    });

    // Send email notification using template
    await this.emailProducer.sendVendorLoginNotification(
      vendorEmail,
      vendorName,
      device,
      location,
      eventData?.ipAddress || 'N/A',
    );

    this.logger.log(`Login notification sent to vendor ${vendorId}`);
  }

  /**
   * Send notification when vendor account is created
   */
  async notifyAccountCreated(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    storeName: string,
  ) {
    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Welcome to Asoose!',
      message: `Your vendor account has been created successfully. Your store "${storeName}" is pending approval.`,
      type: 'SYSTEM',
      category: 'ACCOUNT_CREATED',
      metadata: {
        storeName,
        createdAt: new Date().toISOString(),
      },
    });

    // Send welcome email using template
    await this.emailProducer.sendVendorAccountCreated(
      vendorEmail,
      vendorName,
      storeName,
    );

    this.logger.log(`Account creation notification sent to vendor ${vendorId}`);
  }

  /**
   * Send notification when password is changed
   */
  async notifyPasswordChanged(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    eventData?: SecurityEventData,
  ) {
    const timestamp = eventData?.timestamp || new Date();

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Password Changed',
      message: `Your password was changed successfully on ${timestamp.toLocaleString()}`,
      type: 'SECURITY',
      category: 'PASSWORD_CHANGED',
      metadata: {
        timestamp: timestamp.toISOString(),
        ipAddress: eventData?.ipAddress,
      },
    });

    // Send email notification using template
    await this.emailProducer.sendVendorPasswordChanged(
      vendorEmail,
      vendorName,
      eventData?.ipAddress || 'N/A',
    );

    this.logger.log(`Password change notification sent to vendor ${vendorId}`);
  }

  /**
   * Send notification when password is reset
   */
  async notifyPasswordReset(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    eventData?: SecurityEventData,
  ) {
    const timestamp = eventData?.timestamp || new Date();

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Password Reset',
      message: `Your password was reset successfully on ${timestamp.toLocaleString()}`,
      type: 'SECURITY',
      category: 'PASSWORD_RESET',
      metadata: {
        timestamp: timestamp.toISOString(),
      },
    });

    // Send email notification
    const emailMessage = `
      Hello ${vendorName},

      Your password has been reset successfully.

      Time: ${timestamp.toLocaleString()}

      If you did NOT request this password reset, please contact us immediately at hello@asoose.com

      For your security:
      - Never share your password with anyone
      - Use a strong, unique password
      - Enable two-factor authentication if available

      Best regards,
      The Asoose Team
    `;

    await this.emailProducer.sendVendorMessage(
      vendorEmail,
      'Password Reset Successful - Asoose Vendor Account',
      emailMessage,
    );

    this.logger.log(`Password reset notification sent to vendor ${vendorId}`);
  }

  /**
   * Send notification when bank account is added
   */
  async notifyBankAccountAdded(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    bankName: string,
    accountNumber: string,
  ) {
    // Mask account number (show last 4 digits)
    const maskedAccount = '****' + accountNumber.slice(-4);

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Bank Account Added',
      message: `A new bank account (${bankName} - ${maskedAccount}) was added to your profile`,
      type: 'SECURITY',
      category: 'BANK_ACCOUNT_ADDED',
      metadata: {
        bankName,
        maskedAccount,
        timestamp: new Date().toISOString(),
      },
    });

    // Send email notification using template
    await this.emailProducer.sendVendorBankAccountAdded(
      vendorEmail,
      vendorName,
      bankName,
      accountNumber,
    );

    this.logger.log(
      `Bank account addition notification sent to vendor ${vendorId}`,
    );
  }

  /**
   * Send notification when bank account is updated
   */
  async notifyBankAccountUpdated(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    bankName: string,
    accountNumber: string,
  ) {
    const maskedAccount = '****' + accountNumber.slice(-4);

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Bank Account Updated',
      message: `Your bank account details (${bankName} - ${maskedAccount}) were updated`,
      type: 'SECURITY',
      category: 'BANK_ACCOUNT_UPDATED',
      metadata: {
        bankName,
        maskedAccount,
        timestamp: new Date().toISOString(),
      },
    });

    // Send email notification
    const emailMessage = `
      Hello ${vendorName},

      Your bank account details have been updated:

      Bank: ${bankName}
      Account Number: ${maskedAccount}
      Updated: ${new Date().toLocaleString()}

      If you did not make this change, please contact us immediately at hello@asoose.com

      Best regards,
      The Asoose Team
    `;

    await this.emailProducer.sendVendorMessage(
      vendorEmail,
      'Bank Account Updated - Asoose Vendor Account',
      emailMessage,
    );

    this.logger.log(
      `Bank account update notification sent to vendor ${vendorId}`,
    );
  }

  /**
   * Send notification when bank account is deleted
   */
  async notifyBankAccountDeleted(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    bankName: string,
  ) {
    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Bank Account Removed',
      message: `Your bank account (${bankName}) was removed from your profile`,
      type: 'SECURITY',
      category: 'BANK_ACCOUNT_DELETED',
      metadata: {
        bankName,
        timestamp: new Date().toISOString(),
      },
    });

    // Send email notification
    const emailMessage = `
      Hello ${vendorName},

      Your bank account (${bankName}) has been removed from your vendor profile.

      Time: ${new Date().toLocaleString()}

      You will need to add a new bank account to receive payouts.

      If you did not remove this account, please contact us immediately at hello@asoose.com

      Best regards,
      The Asoose Team
    `;

    await this.emailProducer.sendVendorMessage(
      vendorEmail,
      'Bank Account Removed - Asoose Vendor Account',
      emailMessage,
    );

    this.logger.log(
      `Bank account deletion notification sent to vendor ${vendorId}`,
    );
  }

  /**
   * Send notification when profile image is updated
   */
  async notifyProfileImageUpdated(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
  ) {
    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Profile Image Updated',
      message: 'Your profile image was updated successfully',
      type: 'SYSTEM',
      category: 'PROFILE_UPDATED',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Profile image update notification sent to vendor ${vendorId}`,
    );
  }

  /**
   * Send notification when account deletion is requested
   */
  async notifyAccountDeletionRequested(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
  ) {
    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Account Deletion Requested',
      message:
        'Your account deletion request has been submitted and is pending admin review',
      type: 'SECURITY',
      category: 'ACCOUNT_DELETION_REQUESTED',
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

    // Send email notification using template
    await this.emailProducer.sendVendorAccountDeletionRequest(
      vendorEmail,
      vendorName,
    );

    this.logger.log(
      `Account deletion request notification sent to vendor ${vendorId}`,
    );
  }

  /**
   * Send notification when withdrawal is created
   */
  async notifyWithdrawalCreated(
    vendorId: string,
    vendorEmail: string,
    vendorName: string,
    amount: number,
    bankName: string,
    accountNumber: string,
  ) {
    const maskedAccount = '****' + accountNumber.slice(-4);

    // Create in-app notification with push notification
    await this.notificationsService.createForVendor({
      vendorId,
      title: 'Withdrawal Requested',
      message: `Your withdrawal request of ₦${amount.toLocaleString()} to ${bankName} (${maskedAccount}) is being processed`,
      type: 'PAYOUT',
      category: 'WITHDRAWAL_REQUESTED',
      metadata: {
        amount,
        bankName,
        maskedAccount,
        timestamp: new Date().toISOString(),
      },
    });

    // Send email notification using template
    await this.emailProducer.sendVendorWithdrawalCreated(
      vendorEmail,
      vendorName,
      amount.toLocaleString(),
      bankName,
      accountNumber,
    );

    this.logger.log(
      `Withdrawal creation notification sent to vendor ${vendorId}`,
    );
  }
}
