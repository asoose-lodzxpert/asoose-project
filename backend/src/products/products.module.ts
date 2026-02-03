import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { VendorProductsService } from '../vendor/products/products.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [StorageModule],
  controllers: [CategoriesController],
  providers: [VendorProductsService, PrismaService, StorageService],
  exports: [],
})
export class ProductsModule {}
