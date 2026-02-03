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
}
