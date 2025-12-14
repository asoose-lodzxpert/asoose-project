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
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
      },
    );
  }
}
