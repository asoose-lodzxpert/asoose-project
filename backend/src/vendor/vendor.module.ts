import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { PrismaModule } from '../prisma/prisma.module';
import { VendorAuthService } from '../auth/vendor-auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { OtpModule } from '../auth/otp.module';
import { NubanService } from '../libs/nuban/nuban.service';

// Products
import { VendorProductsService } from './products/products.service';
import { VendorProductsController } from './products/products.controller';

// Orders
import { VendorOrdersService } from './orders/vendor-orders.service';
import { VendorOrdersController } from './orders/vendor-orders.controller';

// Notifications
import { VendorNotificationsService } from './notifications/vendor-notifications.service';
import { VendorNotificationsController } from './notifications/vendor-notifications.controller';

import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule, JwtModule, MailModule, OtpModule],
  controllers: [
    VendorProductsController,
    VendorOrdersController,
    VendorNotificationsController,
    VendorController,
  ],
  providers: [
    VendorProductsService,
    VendorOrdersService,
    VendorNotificationsService,
    VendorService,
    VendorAuthService,
    NubanService,
  ],
})
export class VendorModule {}
