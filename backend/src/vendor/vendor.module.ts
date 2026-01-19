import { Module, OnModuleInit } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { PrismaModule } from '../prisma/prisma.module';
import { VendorAuthService } from '../auth/vendor-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { OtpModule } from '../auth/otp.module';
import { NubanService } from '../libs/nuban/nuban.service';
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

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JwtModule,
    MailModule,
    OtpModule,
    NotificationsModule,
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
    VendorService,
    VendorAuthService,
    NubanService,
  ],
  exports: [VendorSecurityNotificationsService, VendorOrdersStreamService],
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

    // Set up the circular dependency
    vendorAuthService.setSecurityNotificationsService(
      securityNotificationsService,
    );
  }
}
