import { Module } from '@nestjs/common';
import { RiderNotificationsController } from './rider-notifications.controller';
import { RiderNotificationsService } from './rider-notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RiderNotificationsController],
  providers: [RiderNotificationsService],
  exports: [RiderNotificationsService],
})
export class RidersModule {}
