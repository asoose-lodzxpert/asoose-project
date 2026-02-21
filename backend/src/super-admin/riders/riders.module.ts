import { Module } from '@nestjs/common';
import { RidersModule as CoreRidersModule } from '../../riders/riders.module';
import { RidersService } from './riders.service';
import { RidersController } from './rider.controller';
import { DriversController } from './drivers.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { AuthModule } from 'src/auth/auth.module';
import { TransactionsModule } from '../transactions/transaction.module';
import { MatchingModule } from 'src/matching/matching.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    CoreRidersModule,
    AuthModule,
    TransactionsModule,
    MatchingModule,
    PaymentModule,
  ],
  controllers: [RidersController, DriversController],
  providers: [RidersService, ActivityLogService],
})
export class RidersModule {}
