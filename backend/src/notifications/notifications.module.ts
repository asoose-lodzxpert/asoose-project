import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { ExpoModule } from '../libs/expo/expo.module';
import { FcmModule } from '../libs/fcm/fcm.module';
import { MatchingEventsListener } from './listeners/matching-events.listener';
import { DriverLocationListener } from './listeners/driver-location.listener';
import { RiderJobEventsListener } from './listeners/rider-job-events.listener';
import { MatchingModule } from '../matching/matching.module';
@Global()
@Module({
  imports: [PrismaModule, AuthModule, ExpoModule, FcmModule, MatchingModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsService,
    MatchingEventsListener,
    DriverLocationListener,
    RiderJobEventsListener,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
