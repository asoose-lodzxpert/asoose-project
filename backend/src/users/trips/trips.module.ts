import { Module, forwardRef } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MatchingModule } from '../../matching/matching.module';
import { PaymentModule } from '../../payment/payment.module';

@Module({
  imports: [PrismaModule, MatchingModule, forwardRef(() => PaymentModule)],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
