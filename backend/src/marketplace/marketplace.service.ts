import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async getHomepageData() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });


    const restaurants = await this.prisma.store.findMany({
      where: { type: 'RESTAURANT' }, 
      take: 10,
      orderBy: { rating: 'desc' },
      include: {
        products: { take: 3, where: { isAvailable: true } }
      }
    });

    return { categories, restaurants };
  }

  async getRestaurant(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        products: { where: { isAvailable: true }, include: { category: true } }
      }
    });
    return store;
  }
}