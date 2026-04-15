import { Module } from '@nestjs/common';
import { AdminNotificationsService } from './notifications.service';
import { AdminNotificationsController } from './notifications.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';
import { ExpoModule } from 'src/libs/expo/expo.module';

@Module({
  imports: [PrismaModule, FcmModule, ExpoModule],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService],
  exports: [AdminNotificationsService],
})
export class AdminNotificationsModule {}
