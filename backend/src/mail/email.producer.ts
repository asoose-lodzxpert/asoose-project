import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EmailProducer {
  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async sendWelcomeEmail(email: string, name?: string) {
    await this.emailQueue.add(
      'send-welcome',
      { email, name },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
      },
    );
  }

  async sendPasswordResetOtp(email: string, name: string, otp: string) {
    await this.emailQueue.add(
      'rider-password-reset-otp',
      { email, name, otp },
      {
        attempts: 3,
        backoff: { type: 'fixed', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }

  async sendVendorMessage(email: string, subject: string, message: string) {
    await this.emailQueue.add(
      'send-vendor-message', // Job Name
      { email, subject, message }, // Payload
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendOrderCreatedCustomer(
    email: string,
    orderId: string,
    total: number,
  ) {
    await this.emailQueue.add(
      'order-created-customer',
      { email, orderId, total },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendOrderCreatedVendor(
    email: string,
    storeName: string,
    orderId: string,
    items: any[],
  ) {
    await this.emailQueue.add(
      'order-created-vendor',
      { email, storeName, orderId, items },
      { attempts: 3, removeOnComplete: true },
    );
  }

  // ========== VENDOR SECURITY NOTIFICATION TEMPLATES ==========

  async sendVendorLoginNotification(
    email: string,
    vendorName: string,
    device: string,
    location: string,
    ipAddress: string,
  ) {
    await this.emailQueue.add(
      'vendor-login-notification',
      {
        email,
        vendorName,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        device,
        location,
        ipAddress,
        securityUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/security`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorAccountCreated(
    email: string,
    vendorName: string,
    storeName: string,
  ) {
    await this.emailQueue.add(
      'vendor-account-created',
      {
        email,
        vendorName,
        storeName,
        dashboardUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/dashboard`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorPasswordChanged(
    email: string,
    vendorName: string,
    ipAddress: string,
  ) {
    await this.emailQueue.add(
      'vendor-password-changed',
      {
        email,
        vendorName,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        ipAddress,
        securityUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/security`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorPasswordReset(
    email: string,
    vendorName: string,
    resetCode: string,
  ) {
    await this.emailQueue.add(
      'vendor-password-reset',
      {
        email,
        vendorName,
        resetCode,
        resetUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/reset-password`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorSignupOtp(email: string, name: string, otp: string) {
    await this.emailQueue.add(
      'vendor-signup-otp',
      {
        email,
        name,
        otp,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorBankAccountAdded(
    email: string,
    vendorName: string,
    bankName: string,
    accountNumber: string,
  ) {
    // Mask account number (show last 4 digits)
    const maskedAccount = `****${accountNumber.slice(-4)}`;

    await this.emailQueue.add(
      'vendor-bank-added',
      {
        email,
        vendorName,
        bankName,
        maskedAccount,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        bankAccountUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/settings/bank-accounts`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorWithdrawalCreated(
    email: string,
    vendorName: string,
    amount: string,
    bankName: string,
    accountNumber: string,
  ) {
    // Mask account number (show last 4 digits)
    const maskedAccount = `****${accountNumber.slice(-4)}`;

    await this.emailQueue.add(
      'vendor-withdrawal',
      {
        email,
        vendorName,
        amount,
        bankName,
        maskedAccount,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        withdrawalsUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/withdrawals`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendVendorAccountDeletionRequest(email: string, vendorName: string) {
    await this.emailQueue.add(
      'vendor-deletion-request',
      {
        email,
        vendorName,
        supportUrl: `${process.env.VENDOR_APP_URL || 'https://vendor.asoose.com'}/support`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  // ========== RIDER EMAIL TEMPLATES ==========

  async sendRiderWelcomeEmail(email: string, name: string) {
    await this.emailQueue.add(
      'rider-welcome',
      {
        email,
        name,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendRiderPasswordResetOtp(email: string, name: string, otp: string) {
    await this.emailQueue.add(
      'rider-password-reset',
      {
        email,
        name,
        otp,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendRiderPasswordChanged(
    email: string,
    name: string,
    ipAddress: string,
  ) {
    await this.emailQueue.add(
      'rider-password-changed',
      {
        email,
        name,
        timestamp: new Date().toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        }),
        ipAddress,
        securityUrl: `${process.env.RIDER_APP_URL || 'https://rider.asoose.com'}/security`,
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  async sendRiderAccountApproved(
    email: string,
    name: string,
    commissionRate: number = 85,
  ) {
    await this.emailQueue.add(
      'rider-account-approved',
      {
        email,
        name,
        commissionRate,
        appUrl: process.env.RIDER_APP_URL || 'https://rider.asoose.com',
        year: new Date().getFullYear(),
      },
      { attempts: 3, removeOnComplete: true },
    );
  }

  // ========== USER EMAIL HANDLERS ==========

  async sendUserMessage(email: string, subject: string, message: string) {
    await this.emailQueue.add(
      'send-user-message',
      { email, subject, message },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendRiderMessage(email: string, subject: string, message: string) {
    await this.emailQueue.add(
      'send-rider-message',
      { email, subject, message },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  // ========== ADMIN ALERT HANDLERS ==========

  async sendAdminAlert(adminEmails: string, subject: string, message: string) {
    await this.emailQueue.add(
      'admin-alert',
      { adminEmails, subject, message },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  // ========== NOTIFICATION TEMPLATE HANDLERS ==========

  async sendVendorStoreStatusNotification(
    email: string,
    vendorName: string,
    storeName: string,
    newStatus: string,
    reason: string,
  ) {
    await this.emailQueue.add(
      'vendor-store-status',
      {
        email,
        vendorName,
        storeName,
        newStatus,
        reason,
        isSuspended: newStatus === 'SUSPENDED',
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendVendorProductStatusNotification(
    email: string,
    vendorName: string,
    productName: string,
    newStatus: string,
    rejectionReason?: string,
  ) {
    await this.emailQueue.add(
      'vendor-product-status',
      {
        email,
        vendorName,
        productName,
        newStatus,
        rejectionReason,
        isRejected: newStatus === 'DISABLED' && rejectionReason,
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendRiderAccountStatusNotification(
    email: string,
    riderName: string,
    newStatus: string,
    reason: string,
  ) {
    await this.emailQueue.add(
      'rider-account-status',
      {
        email,
        riderName,
        newStatus,
        reason,
        isActive: newStatus === 'ACTIVE',
        isSuspended: newStatus === 'SUSPENDED',
        isBanned: newStatus === 'BANNED',
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendRiderDocumentVerificationNotification(
    email: string,
    riderName: string,
    documentType: string,
    status: string,
    rejectionReason?: string,
  ) {
    await this.emailQueue.add(
      'rider-document-verification',
      {
        email,
        riderName,
        documentType,
        status,
        rejectionReason,
        isVerified: status === 'VERIFIED',
        isRejected: status === 'REJECTED',
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendCustomerAccountStatusNotification(
    email: string,
    userName: string,
    newStatus: string,
    reason: string,
  ) {
    await this.emailQueue.add(
      'customer-account-status',
      {
        email,
        userName,
        newStatus,
        reason,
        isActive: newStatus === 'ACTIVE',
        isSuspended: newStatus === 'SUSPENDED',
        isBanned: newStatus === 'BANNED',
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }

  async sendAdminHighValueWithdrawalAlert(
    adminEmails: string,
    entityType: string,
    amount: number,
    accountName: string,
    accountNumber: string,
    bankCode: string,
  ) {
    await this.emailQueue.add(
      'admin-high-value-withdrawal',
      {
        adminEmails,
        entityType,
        amount,
        accountName,
        accountNumber,
        bankCode,
      },
      {
        attempts: 3,
        removeOnComplete: true,
      },
    );
  }
}
