import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoreType } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';

const isUUID = (str: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export interface HomeVertical {
  id: string;
  type: StoreType;
  title: string;
  categories: { id: string; name: string; image: string }[];
  vendors: any[];
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
        vendors: this.mapStoresToVendors(stores),
      });
    }
    return { verticals };
  }

  // NEW: Optimized single category fetch
  // src/marketplace/marketplace.service.ts

  async getCategoryData(verticalId: string, filter?: string) {
    // 1. Determine Sorting Logic based on the filter
    let orderBy: any = { createdAt: 'desc' }; // Default: Newest first

    if (filter === 'Top Rated') {
      orderBy = { rating: 'desc' };
    } else if (filter === 'Fastest Delivery') {
      // NOTE: Only works if you added 'deliveryTime' to your Store schema. 
      // If not, this will default to sorting by name or ignore it.
      // orderBy = { deliveryTime: 'asc' }; 
    } 
    // Add logic for 'Low Delivery Fee' if you have that column

    // 2. Fetch the data with the dynamic sort
    const stores = await this.prisma.store.findMany({
      where: {
        // Match the store type (vertical) derived from ID
        // Assuming 'food' maps to 'RESTAURANT', etc. 
        // You might need a helper map here like the frontend has
        type: this.mapSlugToType(verticalId), 
        status: 'ACTIVE',
      },
      orderBy: orderBy,
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true, // mapped to 'image' in frontend
        rating: true,
        type: true,
        // deliveryTime: true, // Uncomment if schema has it
        // deliveryFee: true,  // Uncomment if schema has it
      }
    });

    // 3. Return formatted structure
    return {
      id: verticalId,
      title: this.formatTitle(verticalId),
      vendors: stores.map(store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        image: store.logo,
        rating: store.rating || 0,
        type: store.type,
        // Fallbacks if columns don't exist yet
        deliveryTime: '30-45 min', 
        deliveryFee: 500,
        prepTime: 20
      })),
    };
  }

  // Helper to map URL slug (food) to DB Enum (RESTAURANT)
  private mapSlugToType(slug: string): any {
    const map: Record<string, string> = {
      'food': 'RESTAURANT',
      'grocery': 'GROCERY',
      'pharmacy': 'PHARMACY',
      'market': 'MARKET'
    };
    // Return mapped type or fallback (or handle error)
    return map[slug.toLowerCase()] || 'RESTAURANT';
  }

  private formatTitle(slug: string): string {
    const titles: Record<string, string> = {
      'food': 'Food Delivery',
      'grocery': 'Groceries',
      'pharmacy': 'Pharmacy',
      'market': 'Local Market'
    };
    return titles[slug.toLowerCase()] || slug;
  }

  async search(query: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        verification: 'VERIFIED',
        name: { contains: query, mode: 'insensitive' },
      },
      take: 10,
    });

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        store: { status: 'ACTIVE' },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { category: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      include: {
        store: { select: { name: true, slug: true, id: true } },
        category: { select: { name: true } },
      },
      take: 20,
    });

    return { stores, products };
  }

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
      image: store.logo,
      address: store.address || 'Address not available',
      rating: store.rating || 0,
      deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
      products: store.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        description: p.slug, 
        category: { name: p.category.name },
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

  private mapStoresToVendors(stores: any[]) {
    return stores.map((store) => ({
      id: store.id,
      slug: store.slug, 
      name: store.name,
      image: store.image,
      rating: store.rating || 0,
      ratingCount: store.ratingCount || 0,
      deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
      address: store.address,
      deliveryFee: 500,
      type: store.type
    }));
  }

  async upsertReview(userId: string, dto: CreateReviewDto) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) throw new Error('Store not found');

    const review = await this.prisma.review.upsert({
      where: { userId_storeId: { userId: userId, storeId: dto.storeId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { userId: userId, storeId: dto.storeId, rating: dto.rating, comment: dto.comment },
    });
    return review;
  }

  async deleteReview(userId: string, storeId: string) {
     return this.prisma.review.delete({
      where: { userId_storeId: { userId: userId, storeId: storeId } },
    });
  }
}