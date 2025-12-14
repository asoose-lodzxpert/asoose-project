import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailProducer } from './email.producer';
import { EmailProcessor } from './email.processor';
import { EmailQueue } from '../queue/email.queue';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
    }),
    EmailQueue,
  ],
  providers: [EmailProducer, EmailProcessor],
  exports: [EmailProducer],
})
export class MailModule {}
