import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreType } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

// Robust UUID Regex
const isUUID = (str: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export interface HomeVertical {
  id: string;
  type: StoreType;
  title: string;
  categories: { id: string; name: string; image: string }[];
  vendors: {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    rating: number;
    ratingCount: number;
    deliveryTime: string;
    address: string | null;
    deliveryFee: number;
  }[];
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(private prisma: PrismaService) {}

  async getHomeData() {
    const verticalTypes: StoreType[] = ['RESTAURANT', 'GROCERY', 'PHARMACY', 'MARKET'];
    const verticals: HomeVertical[] = [];

    for (const type of verticalTypes) {
      const stores = await this.prisma.store.findMany({
        where: { type, status: 'ACTIVE', verification: 'VERIFIED' },
        take: 10,
        orderBy: { rating: 'desc' },
      });

      if (stores.length === 0) continue;

      const categories = await this.prisma.category.findMany({
        where: { products: { some: { status: 'ACTIVE', store: { type } } } },
        take: 15,
        select: { id: true, name: true },
      });

      verticals.push({
        id: type.toLowerCase(),
        type: type,
        title: this.formatSectionTitle(type),
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          image: this.getCategoryImage(c.name),
        })),
        vendors: stores.map((store) => ({
          id: store.id,
          slug: store.slug, 
          name: store.name,
          image: store.image,
          rating: store.rating || 0,
          ratingCount: store.ratingCount || 0,
          deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
          address: store.address,
          deliveryFee: 500,
        })),
      });
    }
    return { verticals };
  }

  // ... inside MarketplaceService class

async getVendorDetails(identifier: string) {
  const isId = isUUID(identifier);
  const query = isId ? { id: identifier } : { slug: identifier };

  const store = await this.prisma.store.findUnique({
    where: query,
    include: {
      products: {
        where: { status: 'ACTIVE' },
        include: { 
          category: { select: { name: true } },
          // 1. Include Modifiers Here
          modifierGroups: {
            include: { modifiers: true },
            orderBy: { name: 'asc' }
          }
        },
      },
      reviews: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, image: true } }
        }
      }
    },
  });

  if (!store) return null;

  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    type: store.type,
    image: store.image,
    address: store.address || 'Address not available',
    rating: store.rating || 0,
    deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
    products: store.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      description: p.slug, // Using slug as description per your schema/logic
      category: { name: p.category.name },
      // 2. Map Modifiers Here
      modifierGroups: p.modifierGroups.map(g => ({
        id: g.id,
        name: g.name,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        modifiers: g.modifiers.map(m => ({
          id: m.id,
          name: m.name,
          price: m.price
        }))
      }))
    })),
    reviews: store.reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name || 'Anonymous',
      userImage: r.user.image,
      rating: r.rating,
      comment: r.comment,
      date: r.createdAt,
    })),
  };
}

  // --- HELPERS ---
  private formatSectionTitle(type: string): string {
    const title = type.charAt(0) + type.slice(1).toLowerCase();
    return (type === 'GROCERY' || type === 'PHARMACY') ? title.replace('y', 'ies') : title + 's';
  }

  private getCategoryImage(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('burger')) return '/icons/burger.png';
    if (lower.includes('pizza')) return '/icons/pizza.png';
    if (lower.includes('sushi')) return '/icons/sushi.png';
    if (lower.includes('drink')) return '/icons/drink.png';
    return '/icons/default.png';
  }

  private async updateStoreRating(storeId: string) {
    const aggregations = await this.prisma.review.aggregate({
      where: { storeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const newRating = aggregations._avg.rating || 0;
    const totalReviews = aggregations._count.rating || 0;

    await this.prisma.store.update({
      where: { id: storeId },
      data: { 
        rating: Number(newRating.toFixed(1)),
        ratingCount: totalReviews // Now actively saving the count
      },
    });
    
    this.logger.log(`Updated Store ${storeId} rating to ${newRating} (${totalReviews} reviews)`);
  }

  async upsertReview(userId: string, dto: CreateReviewDto) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new Error('Store not found');

    const review = await this.prisma.review.upsert({
      where: {
        userId_storeId: {
          userId: userId,
          storeId: dto.storeId,
        },
      },
      update: {
        rating: dto.rating,
        comment: dto.comment,
      },
      create: {
        userId: userId,
        storeId: dto.storeId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.updateStoreRating(dto.storeId);

    return review;
  }
  


async deleteReview(userId: string, storeId: string) {
  try {
    const deleted = await this.prisma.review.delete({
      where: {
        userId_storeId: {
          userId: userId,
          storeId: storeId,
        },
      },
    });

    // Recalculate rating after deletion
    await this.updateStoreRating(storeId);

    return deleted;
  } catch (error) {
    throw new Error('Review not found or already deleted');
  }
  }


}