import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EmailProducer {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  async sendWelcomeEmail(email: string) {
    await this.emailQueue.add(
      'send-welcome',
      { email },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
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

async sendOrderCreatedCustomer(email: string, orderId: string, total: number) {
    await this.emailQueue.add(
      'order-created-customer',
      { email, orderId, total },
      { attempts: 3, removeOnComplete: true }
    );
  }

  async sendOrderCreatedVendor(email: string, storeName: string, orderId: string, items: any[]) {
    await this.emailQueue.add(
      'order-created-vendor',
      { email, storeName, orderId, items },
      { attempts: 3, removeOnComplete: true }
    );
  }

}