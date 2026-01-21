import { Module, forwardRef } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { RiderNotificationsController } from './rider-notifications.controller';
import { RiderNotificationsService } from './rider-notifications.service';
import { RiderDispatchListener } from './rider-dispatch.listener';
import { RidersStreamService } from './riders-stream.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TripsModule } from '../users/trips/trips.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => UsersModule),
    TripsModule,
  ],
  controllers: [RidersController, RiderNotificationsController],
  providers: [
    RidersService,
    RiderNotificationsService,
    RiderDispatchListener,
    RidersStreamService,
  ],
  exports: [RidersService, RiderNotificationsService, RidersStreamService],
})
export class RidersModule {}
