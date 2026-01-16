import { Module } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { RiderNotificationsController } from './rider-notifications.controller';
import { RiderNotificationsService } from './rider-notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RidersController, RiderNotificationsController],
  providers: [RidersService, RiderNotificationsService],
  exports: [RidersService, RiderNotificationsService],
})
export class RidersModule {}
