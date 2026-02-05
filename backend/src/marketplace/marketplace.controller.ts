import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Body,
  Request,
  UseGuards,
  Post,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

export interface SearchResponseDto {
  stores: any[];
  products: any[];
}

@Controller({
  path: 'marketplace',
  version: '1',
})
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('home')
  async getHomeData() {
    return this.marketplaceService.getHomeData();
  }

  @Get('search')
  async search(@Query('q') q: string): Promise<SearchResponseDto> {
    if (!q) return { stores: [], products: [] };
    return this.marketplaceService.search(q);
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string, @Query('sort') sort?: string) {
    const categoryData = await this.marketplaceService.getCategoryData(
      id,
      sort || 'all',
    );

    if (!categoryData) {
      throw new NotFoundException(`Category vertical not found: ${id}`);
    }
    return categoryData;
  }

  @Get(['vendor/:id', 'restaurant/:id'])
  async getVendor(@Param('id') id: string) {
    const vendor = await this.marketplaceService.getVendorDetails(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor not found for id/slug: ${id}`);
    }
    return vendor;
  }

  @Get('stores')
  async getStores(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('type') type?: string,
  ) {
    return this.marketplaceService.getPaginatedStores(page, limit, type);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.marketplaceService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`Product not found: ${id}`);
    }
    return product;
  }

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  async upsertReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.marketplaceService.upsertReview(userId, createReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:storeId')
  async deleteReview(@Request() req, @Param('storeId') storeId: string) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.marketplaceService.deleteReview(userId, storeId);
  }
}
