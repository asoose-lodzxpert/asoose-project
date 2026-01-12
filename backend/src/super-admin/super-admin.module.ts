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
import { SettingsController } from './settings/settings.controller';
import { SettingsService } from './settings/settings.service';
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
  ],
  controllers: [SettingsController],
  providers: [ PrismaService,SettingsService],
})
export class SuperAdminModule {}
