import { Module, forwardRef } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { RidesService } from './rides.service';
import { DeliveriesService } from './deliveries.service';
import { TripsCommonService } from './trips.common.service';
import { RidesCleanupService } from './rides-cleanup.service'; // <--- Import
import { PrismaModule } from '../../prisma/prisma.module';
import { MatchingModule } from '../../matching/matching.module';
import { PaymentModule } from '../../payment/payment.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { MatchingRedisModule } from 'src/matching/redis/redis.module';
import { TestController } from 'src/test/test.controller';

@Module({
  imports: [
    PrismaModule,
    MatchingModule,
    NotificationsModule,
    MatchingRedisModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [TripsController, TestController],
  providers: [
    TripsService,
    RidesService,
    DeliveriesService,
    TripsCommonService,
    RidesCleanupService, // <--- Register Provider
  ],
  exports: [TripsService],
})
export class TripsModule {}
