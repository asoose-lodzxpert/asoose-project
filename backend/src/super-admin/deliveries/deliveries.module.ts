import { Module } from '@nestjs/common';
import { DeliveriesService } from './delivery.service';
import { DeliveriesController } from './deliveries.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsModule } from '../transactions/transaction.module';
import { NotificationsModule } from '../../notifications/notifications.module';
@Module({
  imports: [TransactionsModule, NotificationsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, PrismaService],
})
export class DeliveriesModule {}
