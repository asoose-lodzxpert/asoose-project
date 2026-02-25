import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorAuthService } from '../auth/vendor-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { OtpModule } from '../auth/otp.module';
import { NubanService } from '../libs/nuban/nuban.service';
import { PaystackAccountService } from '../payment/paystack-account.service';
import { PaystackService } from '../payment/paystack.service';
import { ModuleRef } from '@nestjs/core';

// Products
import { VendorProductsService } from './products/products.service';
import { VendorProductsController } from './products/products.controller';

// Orders
import { VendorOrdersService } from './orders/vendor-orders.service';
import { VendorOrdersController } from './orders/vendor-orders.controller';
import { VendorOrdersStreamService } from './orders/vendor-orders-stream.service';

// Notifications
import { VendorNotificationsService } from './notifications/vendor-notifications.service';
import { VendorNotificationsController } from './notifications/vendor-notifications.controller';
import { VendorSecurityNotificationsService } from './notifications/vendor-security-notifications.service';

import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

// Services
import { ActivityLogService } from 'src/common/services/activity-log.services';
// Ensure this path points to where your StoresService actually is
// import { StoresService } from './stores/stores.service';
import { StoresService } from 'src/super-admin/vendors/vendors.service';
import { TransactionsModule } from 'src/super-admin/transactions/transaction.module';
import { VendorAccountNotificationsService } from './notifications/vendor-account-notifications.service';
import { CommonModule } from '../common/common.module';
import { TokenRevocationService } from 'src/auth/token-revocation.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JwtModule,
    MailModule,
    OtpModule,
    NotificationsModule,
    CommonModule,
    RedisModule,
    CacheModule.register(),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [
    VendorProductsController,
    VendorOrdersController,
    VendorNotificationsController,
    VendorController,
  ],
  providers: [
    VendorProductsService,
    VendorOrdersService,
    VendorOrdersStreamService,
    VendorNotificationsService,
    VendorSecurityNotificationsService,
    VendorAccountNotificationsService,
    VendorService,
    VendorAuthService,
    NubanService, // kept for any remaining usages
    PaystackAccountService,
    PaystackService,
    TokenRevocationService,

    ActivityLogService,
    StoresService,
  ],
  exports: [
    VendorSecurityNotificationsService,
    VendorOrdersStreamService,
    VendorAccountNotificationsService,
  ],
})
export class VendorModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    const vendorAuthService = this.moduleRef.get(VendorAuthService, {
      strict: false,
    });
    const securityNotificationsService = this.moduleRef.get(
      VendorSecurityNotificationsService,
      { strict: false },
    );

    vendorAuthService.setSecurityNotificationsService(
      securityNotificationsService,
    );
  }
}
