import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transaction.module';
@Module({
  imports: [PrismaModule,TransactionsModule,],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}