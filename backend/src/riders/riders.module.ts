import { Module, forwardRef } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { RiderNotificationsController } from './rider-notifications.controller';
import { RiderNotificationsService } from './rider-notifications.service';
import { RiderDispatchListener } from './rider-dispatch.listener';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TripsModule } from '../users/trips/trips.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => UsersModule), // For NotificationFacade
    TripsModule, // For TripsService
  ],
  controllers: [RidersController, RiderNotificationsController],
  providers: [RidersService, RiderNotificationsService, RiderDispatchListener],
  exports: [RidersService, RiderNotificationsService],
})
export class RidersModule {}
