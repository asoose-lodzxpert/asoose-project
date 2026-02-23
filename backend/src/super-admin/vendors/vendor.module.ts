import { Module } from '@nestjs/common';
import { VendorModule as VendorCoreModule } from '../../vendor/vendor.module';
import { VendorsController } from './vendor.controller';
import { StoresService } from './vendors.service';
import { MailModule } from 'src/mail/mail.module';
import { StorageModule } from 'src/storage/storage.module';
import { ActivityService } from './activity.service';
import { OrdersService } from './orders.service';
import { ReviewsService } from './reviews.service';
import { DocumentsService } from './document.service';
import { ActivityLogService } from 'src/common/services/activity-log.services';

@Module({
  imports: [MailModule, VendorCoreModule, StorageModule],
  controllers: [VendorsController],
  providers: [
    StoresService,
    ActivityService,
    OrdersService,
    ReviewsService,
    DocumentsService,
    ActivityLogService,
  ],
  exports: [StoresService],
})
export class VendorModule {}
