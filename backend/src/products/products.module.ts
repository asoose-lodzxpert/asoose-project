import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { VendorProductsService } from '../vendor/products/products.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CategoriesController],
  providers: [VendorProductsService, PrismaService],
  exports: [],
})
export class ProductsModule {}
