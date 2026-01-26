import { Module, forwardRef } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MatchingModule } from '../../matching/matching.module';
import { PaymentModule } from '../../payment/payment.module';
import { TestController } from 'src/test/test.controller';
@Module({
  imports: [PrismaModule, MatchingModule, forwardRef(() => PaymentModule)],
  controllers: [TripsController,TestController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
