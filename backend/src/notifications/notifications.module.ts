import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { ExpoModule } from '../libs/expo/expo.module';
import { FcmModule } from '../libs/fcm/fcm.module';

@Global()
@Module({
  imports: [PrismaModule, AuthModule, ExpoModule, FcmModule],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
