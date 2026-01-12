import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';

import { PrismaModule } from '../prisma/prisma.module';

// Products
import { VendorProductsService } from './products/products.service';
import { VendorProductsController } from './products/products.controller';

// Orders
import { VendorOrdersService } from './orders/vendor-orders.service';
import { VendorOrdersController } from './orders/vendor-orders.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [
    VendorProductsController,
    VendorOrdersController,
    VendorController,
  ],
  providers: [VendorProductsService, VendorOrdersService, VendorService],
})
export class VendorModule {}
