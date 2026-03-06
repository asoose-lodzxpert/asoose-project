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
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MarketplaceService } from './marketplace.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

export interface SearchResponseDto {
  stores: any[];
  products: any[];
}

@ApiTags('Marketplace')
@Controller({
  path: 'marketplace',
  version: '1',
})
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @ApiOperation({
    summary: 'Get home page data (banners, featured stores, categories)',
  })
  @Get('home')
  async getHomeData() {
    return this.marketplaceService.getHomeData();
  }

  @ApiOperation({ summary: 'Get all active promotional banners' })
  @Get('banners')
  async getBanners() {
    return this.marketplaceService.getActiveBanners();
  }

  @ApiOperation({ summary: 'Search stores and products by keyword' })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('search')
  async search(@Query('q') q: string): Promise<SearchResponseDto> {
    if (!q) return { stores: [], products: [] };
    return this.marketplaceService.search(q);
  }

  @ApiOperation({ summary: 'Get stores and products in a category' })
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

  @ApiOperation({ summary: 'Get vendor/restaurant details by ID or slug' })
  @Get(['vendor/:id', 'restaurant/:id'])
  async getVendor(@Param('id') id: string) {
    const vendor = await this.marketplaceService.getVendorDetails(id);
    if (!vendor) {
      throw new NotFoundException(`Vendor not found for id/slug: ${id}`);
    }
    return vendor;
  }

  @ApiOperation({
    summary: 'Get paginated list of stores with optional type filter',
  })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('stores')
  async getStores(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('type') type?: string,
  ) {
    const safeLimit = Math.min(limit, 50); // enforce max 50 per page
    return this.marketplaceService.getPaginatedStores(page, safeLimit, type);
  }

  @ApiOperation({ summary: 'Get product details by ID' })
  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    const product = await this.marketplaceService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`Product not found: ${id}`);
    }
    return product;
  }

  @ApiOperation({ summary: 'Create or update a store review' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  async upsertReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.marketplaceService.upsertReview(userId, createReviewDto);
  }

  @ApiOperation({ summary: 'Delete own review for a store' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:storeId')
  async deleteReview(@Request() req, @Param('storeId') storeId: string) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.marketplaceService.deleteReview(userId, storeId);
  }

  /**
   * Guideline 1.2 — Report offensive / spam UGC content
   * POST /marketplace/report
   */
  @ApiOperation({ summary: 'Report a store or review (UGC moderation)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 reports/minute per user
  @Post('report')
  async reportContent(
    @Request() req,
    @Body()
    body: {
      targetType: 'STORE' | 'REVIEW';
      targetId: string;
      reason: string;
      description?: string;
    },
  ) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    const { targetType, targetId, reason, description } = body;

    if (!['STORE', 'REVIEW'].includes(targetType)) {
      throw new BadRequestException('targetType must be STORE or REVIEW');
    }
    if (!targetId?.trim()) {
      throw new BadRequestException('targetId is required');
    }
    if (!reason?.trim() || reason.trim().length < 3) {
      throw new BadRequestException('reason must be at least 3 characters');
    }

    return this.marketplaceService.reportContent(
      userId,
      targetType,
      targetId,
      reason.trim(),
      description?.trim(),
    );
  }
}
