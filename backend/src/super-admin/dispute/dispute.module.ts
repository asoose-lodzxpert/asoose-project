import { Module } from '@nestjs/common';
import { DisputesService } from './dispute.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DisputesController } from './dispute.controller';
import { TransactionsModule } from '../transactions/transaction.module';
@Module({
  imports: [PrismaModule, TransactionsModule],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
