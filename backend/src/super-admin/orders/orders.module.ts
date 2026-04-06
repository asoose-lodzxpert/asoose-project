import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transaction.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryService } from 'src/users/inventory.service';

@Module({
  imports: [PrismaModule, TransactionsModule, EventEmitterModule.forRoot()],
  controllers: [OrdersController],
  providers: [OrdersService, InventoryService],
  exports: [OrdersService],
})
export class OrdersModule {}
