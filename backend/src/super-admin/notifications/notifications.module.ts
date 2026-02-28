import { Module } from '@nestjs/common';
import { AdminNotificationsService } from './notifications.service';
import { AdminNotificationsController } from './notifications.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';

@Module({
  imports: [PrismaModule, FcmModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
  exports: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
