import { Module } from '@nestjs/common';
import { DeliveriesService } from './delivery.service';
import { DeliveriesController } from './deliveries.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsModule } from '../transactions/transaction.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { GeoModule } from '../../matching/geo/geo.module';
import { FareModule } from '../../fare/fare.module';

@Module({
  imports: [TransactionsModule, NotificationsModule, GeoModule, FareModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, PrismaService],
})
export class DeliveriesModule {}
