import { Module } from '@nestjs/common';
import { RidesService } from './ride.service';
import { RidesController } from './ride.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsModule } from '../transactions/transaction.module';
import { TripsModule } from 'src/users/trips/trips.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [TransactionsModule, TripsModule, NotificationsModule],
  controllers: [RidesController],
  providers: [RidesService, PrismaService],
  exports: [RidesService],
})
export class RidesModule {}
