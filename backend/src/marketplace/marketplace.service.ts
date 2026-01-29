import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Store,
  StoreType,
  StoreStatus,
  VerificationStatus,
  Prisma,
} from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { StorageService } from '../storage/storage.service';
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

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getHomeData() {
    const verticalTypes: StoreType[] = [
      'RESTAURANT',
      'GROCERY',
      'PHARMACY',
      'MARKET',
    ];
    const verticals: HomeVertical[] = [];

    for (const type of verticalTypes) {
      const stores = await this.prisma.store.findMany({
        where: { type, status: 'ACTIVE', verification: 'VERIFIED' },
        take: 10,
        orderBy: { rating: 'desc' },
        select: {
          id: true,
          name: true,
          logo: true,
          slug: true,
          rating: true,
          ratingCount: true,
          prepTime: true,
          address: true,
          type: true,
        },
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

    const banners = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      take: 5,
    });

    return { verticals, banners };
  }

  async getPaginatedStores(page: number, limit: number, type?: string) {
    const skip = (page - 1) * limit;

    // Explicitly type the where object
    const where: Prisma.StoreWhereInput = {
      status: StoreStatus.ACTIVE, // Use the Enum instead of a string
      verification: VerificationStatus.VERIFIED, // Use the Enum instead of a string
      ...(type ? { type: this.mapSlugToType(type) } : {}),
    };

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rating: 'desc' },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      stores: this.mapStoresToVendors(stores),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async getCategoryData(verticalId: string, sortParam?: string) {
    // 1. Determine Sorting Logic
    // We map the frontend codes (RATING_DESC, etc) to Prisma orderBy objects
    let orderBy: any = { rating: 'desc' }; // Default to popular

    switch (sortParam) {
      case 'RATING_DESC':
      case 'top-rated':
        orderBy = { rating: 'desc' };
        break;
      case 'TIME_ASC':
      case 'fastest':
        // Sort by prepTime as a proxy for delivery speed
        orderBy = { prepTime: 'asc' };
        break;
      case 'FEE_ASC':
      case 'cheapest':
        // Delivery Fee is currently calculated dynamically (500), so we can't sort by it in DB.
        // Fallback to sorting by prepTime or Rating, or price if you had a avgPrice column.
        orderBy = { prepTime: 'asc' };
        break;
      case 'all':
      default:
        orderBy = { rating: 'desc' };
    }

    // 2. Fetch the data
    const stores = await this.prisma.store.findMany({
      where: {
        type: this.mapSlugToType(verticalId),
        status: 'ACTIVE',
        verification: 'VERIFIED', // Ensure we only show verified stores
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
        prepTime: true,
        address: true,
      },
    });

    // 3. Return formatted structure matching frontend expectations
    return {
      id: verticalId,
      title: this.formatTitle(verticalId),
      vendors: stores.map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        image: store.logo,
        rating: store.rating || 0,
        type: store.type,
        // Calculate display strings
        deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} min`,
        deliveryFee: 500, // Hardcoded for now per requirements
        prepTime: store.prepTime || 20,
        address: store.address,
      })),
    };
  }

  private mapSlugToType(slug: string): any {
    const map: Record<string, string> = {
      food: 'RESTAURANT',
      grocery: 'GROCERY',
      pharmacy: 'PHARMACY',
      market: 'MARKET',
    };
    return map[slug.toLowerCase()] || 'RESTAURANT';
  }

  private formatTitle(slug: string): string {
    const titles: Record<string, string> = {
      food: 'Food Delivery',
      grocery: 'Groceries',
      pharmacy: 'Pharmacy',
      market: 'Local Market',
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
              orderBy: { name: 'asc' },
            },
          },
        },
        reviews: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, image: true } },
          },
        },
      },
    });

    if (!store) return null;

    return {
      id: store.id,
      slug: store.slug,
      name: store.name,
      type: store.type,
      image: store.logo,
      banner: store.banner,
      address: store.address || 'Address not available',
      rating: store.rating || 0,
      deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
      products: store.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images[0] || null, // Use first image from array
        description: p.slug,
        category: { name: p.category.name },
        modifierGroups: p.modifierGroups.map((g) => ({
          id: g.id,
          name: g.name,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          modifiers: g.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            price: m.price,
          })),
        })),
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
    return type === 'GROCERY' || type === 'PHARMACY'
      ? title.replace('y', 'ies')
      : title + 's';
  }

  private getCategoryImage(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('burger')) return '/icons/burger.png';
    if (lower.includes('pizza')) return '/icons/pizza.png';
    if (lower.includes('sushi')) return '/icons/sushi.png';
    if (lower.includes('drink')) return '/icons/drink.png';
    return '/icons/default.png';
  }

  private mapStoresToVendors(stores: Partial<Store>[]) {
    return stores.map((store) => ({
      id: store.id,
      slug: store.slug,
      name: store.name,
      image: store.logo || null,
      rating: store.rating || 0,
      ratingCount: store.ratingCount || 0,
      deliveryTime: `${store.prepTime || 20} - ${(store.prepTime || 20) + 15} mins`,
      address: store.address,
      deliveryFee: 500,
      type: store.type,
    }));
  }

  async upsertReview(userId: string, dto: CreateReviewDto) {
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store) throw new Error('Store not found');

    const review = await this.prisma.review.upsert({
      where: { userId_storeId: { userId: userId, storeId: dto.storeId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: {
        userId: userId,
        storeId: dto.storeId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    return review;
  }

  async deleteReview(userId: string, storeId: string) {
    return this.prisma.review.delete({
      where: { userId_storeId: { userId: userId, storeId: storeId } },
    });
  }
}
