import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { VendorProductsService } from 'src/vendor/products/products.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Products')
@ApiBearerAuth()
@Controller({
  path: 'categories',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly productsService: VendorProductsService) {}

  @ApiOperation({ summary: 'Get all product categories (cached 5 min)' })
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  async getCategories() {
    return this.productsService.getAllCategories();
  }
}
