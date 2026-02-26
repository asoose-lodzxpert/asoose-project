import { Module } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { NoticesController } from './notices.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';

@Module({
  imports: [PrismaModule, MailModule, FcmModule],
  controllers: [NoticesController],
  providers: [NoticesService],
})
export class NoticesModule {}
