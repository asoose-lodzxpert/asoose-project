import { Controller, Get, Param, NotFoundException,Body,Request,UseGuards,Post,Delete } from '@nestjs/common';
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

  // Support both endpoint styles to be safe
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
  console.log("Logged in User Object:", req.user); 

  const userId = req.user.userId || req.user.sub || req.user.id; 

  if (!userId) {
      throw new Error("User ID could not be found in the token");
  }

  return this.marketplaceService.upsertReview(userId, createReviewDto);
}
@UseGuards(JwtAuthGuard)
  @Delete('reviews/:storeId')
  async deleteReview(@Request() req, @Param('storeId') storeId: string) {
    const userId = req.user.sub || req.user.id || req.user.userId;
    return this.marketplaceService.deleteReview(userId, storeId);
  }

}