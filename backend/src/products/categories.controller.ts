import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { VendorProductsService } from 'src/vendor/products/products.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller({
  path: 'categories',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly productsService: VendorProductsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  async getCategories() {
    return this.productsService.getAllCategories();
  }
}
