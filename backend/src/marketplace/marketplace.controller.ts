import { Controller, Get,NotFoundException,Param } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('home')

  getHomepage() {
    return this.marketplaceService.getHomepageData();
  }

@Get('restaurant/:id')
  async getRestaurant(@Param('id') id: string) {
    const restaurant = await this.marketplaceService.getRestaurant(id);
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }


}