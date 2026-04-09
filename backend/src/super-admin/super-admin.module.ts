import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VendorModule } from './vendors/vendor.module';
import { CustomerModule } from './customers/customer.module';
import { RidersModule } from './riders/riders.module';
import { RidesModule } from './ride/ride.module';
import { OrdersModule } from './orders/orders.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { TransactionsModule } from './transactions/transaction.module';
import { DisputesModule } from './dispute/dispute.module';
import { AnalyticsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ZonesModule } from './zones/zones.modle';
import { VerificationModule } from './verification/verification.module';
import { AdminsModule } from './admins/admins.module';
import { BannerModule } from './banners/banner.module';
import { PayoutsModule } from './payouts/payouts.module';
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { ActivityLogController } from './activity-logs/activity-log.controller';
import { AdminNotificationsModule } from './notifications/notifications.module';
import { MapsModule } from './maps/maps.module';
import { NoticesModule } from './notices/notices.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { CitiesModule } from './cities/cities.module';

@Module({
  imports: [
    DashboardModule,
    VendorModule,
    CustomerModule,
    RidersModule,
    RidesModule,
    OrdersModule,
    DeliveriesModule,
    TransactionsModule,
    DisputesModule,
    AnalyticsModule,
    ZonesModule,
    VerificationModule,
    AdminsModule,
    BannerModule,
    PayoutsModule,
    AdminNotificationsModule,
    MapsModule,
    NoticesModule,
    InquiriesModule,
    CitiesModule,
  ],
  controllers: [SettingsController, ActivityLogController],
  providers: [
    PrismaService,
    SettingsService,
    // 👇 2. Add to providers
    ActivityLogService,
  ],
})
export class SuperAdminModule {}
