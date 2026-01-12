import { Controller, Get, Param, NotFoundException, Body, Request, UseGuards, Post, Delete, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('home')
  async getHomeData() {
    return this.marketplaceService.getHomeData();
  }

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q) return { stores: [], products: [] };
    return this.marketplaceService.search(q);
  }

  @Get('categories/:id')
  async getCategory(
    @Param('id') id: string,
    @Query('sort') sort?: string 
  ) {
    // FIX: Changed @Query('filter') to @Query('sort') to match frontend
    // Default to 'all' if undefined
    const categoryData = await this.marketplaceService.getCategoryData(id, sort || 'all');
    
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