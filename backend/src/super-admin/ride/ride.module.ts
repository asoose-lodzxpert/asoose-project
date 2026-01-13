import { Module } from '@nestjs/common';
import { RidesService } from './ride.service';
import { RidesController } from './ride.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsModule } from '../transactions/transaction.module';
@Module({
  imports: [TransactionsModule],
  controllers: [RidesController],
  providers: [RidesService, PrismaService],
})
export class RidesModule {}
