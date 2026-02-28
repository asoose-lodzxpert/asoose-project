import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { EmailProducer } from './email.producer';
import { ResendService } from './resend.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [ResendService, EmailProcessor, EmailProducer],
  exports: [EmailProducer, BullModule, ResendService],
})
export class MailModule {}
