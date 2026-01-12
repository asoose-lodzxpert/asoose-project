import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaystackService } from './paystack.service';
import { FlutterwaveService } from './flutterwave.service';
import { MonnifyService } from './monnify.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaystackService,
    FlutterwaveService,
    MonnifyService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
