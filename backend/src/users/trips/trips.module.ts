// as/backend/src/users/trips/trips.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { RidesService } from './rides.service';
import { DeliveriesService } from './deliveries.service';
import { TripsCommonService } from './trips.common.service';
import { RidesCleanupService } from './rides-cleanup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MatchingModule } from '../../matching/matching.module';
import { PaymentModule } from '../../payment/payment.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { MatchingRedisModule } from 'src/matching/redis/redis.module';
import { TestController } from 'src/test/test.controller';

import { UsersModule } from '../users.module';
import { MapsModule } from '../../maps/maps.module';

const devOnlyControllers =
  process.env.NODE_ENV !== 'production' ? [TestController] : [];

@Module({
  imports: [
    PrismaModule,
    MatchingModule,
    NotificationsModule,
    MatchingRedisModule,
    MapsModule, // ✅ Added for TripsCommonService to use MapsService
    forwardRef(() => PaymentModule),
    forwardRef(() => UsersModule), // ✅ Added with forwardRef to provide AddressesService
  ],
  controllers: [TripsController, ...devOnlyControllers],
  providers: [
    TripsService,
    RidesService,
    DeliveriesService,
    TripsCommonService,
    RidesCleanupService,
  ],
  exports: [TripsService],
})
export class TripsModule {}
