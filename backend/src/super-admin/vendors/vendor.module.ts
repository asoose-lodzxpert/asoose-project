import { Module } from '@nestjs/common';
import { VendorsController } from './vendor.controller';
import { StoresService } from './vendors.service';
import { MailModule } from 'src/libs/mail/mail.module'; 
import { ActivityService } from './activity.service';
import { OrdersService } from './orders.service';
import { ReviewsService } from './reviews.service';
import { DocumentsService } from './document.service';

@Module({
  imports: [
    MailModule, 
  ],
  controllers: [
    VendorsController,
  ],
  providers: [
    StoresService,
    ActivityService,
    OrdersService,
    ReviewsService,
    DocumentsService
  ],
})
export class VendorModule {}