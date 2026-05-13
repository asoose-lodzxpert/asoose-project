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
import { isStoreCurrentlyOpen } from '../shared/vendor-availability.util';

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

  async getActiveBanners() {
    const banners = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    return Promise.all(
      banners.map(async (b) => ({
        ...b,
        image: await this.resolveImage(b.image ?? null),
      })),
    );
  }

  async getHomeData(cityId?: string) {
    const verticalTypes: StoreType[] = [
      'RESTAURANT',
      'GROCERY',
      'PHARMACY',
      'MARKET',
    ];
    const verticals: HomeVertical[] = [];

    for (const type of verticalTypes) {
      const stores = await this.prisma.store.findMany({
        where: {
          type,
          status: 'ACTIVE',
          verification: 'VERIFIED',
          products: { some: { status: 'ACTIVE' } },
          // Filter by city only if provided; otherwise show all
          ...(cityId ? { cityId } : {}),
        },
        take: 12,
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
          lat: true,
          lng: true,
          type: true,
          isOpen: true,
          openHours: true,
          openingHours: true,
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
        vendors: this.mapStoresToVendors(stores.slice(0, 10)),
      });
    }

    const banners = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      take: 5,
    });

    return { verticals, banners };
  }

  private async resolveImage(key: string | null): Promise<string | null> {
    if (!key) return null;
    if (key.startsWith('http')) return key; // Handle legacy or external URLs
    try {
      // FIX: Use the existing public method from StorageService
      // Note: getPublicUrl is synchronous, so 'await' is technically not needed but harmless if kept in an async function
      return this.storage.getPublicUrl(key);
    } catch (error) {
      this.logger.warn(`Failed to resolve image for key: ${key}`);
      return null;
    }
  }
  async getPaginatedStores(page: number, limit: number, type?: string, cityId?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {
      status: StoreStatus.ACTIVE,
      verification: VerificationStatus.VERIFIED,
      products: { some: { status: 'ACTIVE' } },
      ...(type ? { type: this.mapSlugToType(type) } : {}),
      // Filter by city only if provided
      ...(cityId ? { cityId } : {}),
    };

    const total = await this.prisma.store.count({ where });
    const stores = await this.prisma.store.findMany({
      where,
      orderBy: { rating: 'desc' },
      include: { openingHours: true },
      skip,
      take: limit,
    });

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

  async getCategoryData(verticalId: string, sortParam?: string, cityId?: string) {
    let orderBy: any = { rating: 'desc' };

    switch (sortParam) {
      case 'RATING_DESC':
      case 'top-rated':
        orderBy = { rating: 'desc' };
        break;
      case 'TIME_ASC':
      case 'fastest':
        orderBy = { prepTime: 'asc' };
        break;
      case 'FEE_ASC':
      case 'cheapest':
        orderBy = { prepTime: 'asc' };
        break;
      case 'all':
      default:
        orderBy = { rating: 'desc' };
    }

    const stores = await this.prisma.store.findMany({
      where: {
        type: this.mapSlugToType(verticalId),
        status: 'ACTIVE',
        verification: 'VERIFIED',
        products: { some: { status: 'ACTIVE' } },
        // Filter by city only if provided
        ...(cityId ? { cityId } : {}),
      },
      orderBy: orderBy,
      include: { openingHours: true },
      take: 24,
    });

    // Return formatted structure matching frontend expectations
    return {
      id: verticalId,
      title: this.formatTitle(verticalId),
      vendors: stores.map((store) => {
        const avail = isStoreCurrentlyOpen({
          isOpen: (store as any).isOpen ?? true,
          openingHours: (store as any).openingHours ?? [],
          openHours: (store as any).openHours,
        });
        return {
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
          isCurrentlyOpen: avail.open,
          closedReason: avail.reason,
          closedMessage: avail.open ? null : avail.message,
        };
      }),
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

  async search(query: string, cityId?: string) {
    const stores = await this.prisma.store.findMany({
      where: {
        status: 'ACTIVE',
        verification: 'VERIFIED',
        products: { some: { status: 'ACTIVE' } },
        lat: { not: null },
        lng: { not: null },
        name: { contains: query, mode: 'insensitive' },
        ...(cityId ? { cityId } : {}),
      },
      take: 10,
      include: { openingHours: true },
    });

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        store: { 
          status: 'ACTIVE',
          ...(cityId ? { cityId } : {}),
        },
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

    const storesWithAvailability = stores.map((s) => {
      const avail = isStoreCurrentlyOpen({
        isOpen: s.isOpen,
        openingHours: s.openingHours,
        openHours: s.openHours,
      });
      return {
        ...s,
        isCurrentlyOpen: avail.open,
        closedReason: avail.reason,
        closedMessage: avail.open ? null : avail.message,
      };
    });

    return { stores: storesWithAvailability, products };
  }

  async getVendorDetails(identifier: string, cityId?: string) {
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
        openingHours: true,
      },
    });

    if (!store) return null;

    // Hide store if it lacks GPS coordinates — ordering would fail anyway
    if (store.lat == null || store.lng == null) return null;

    const availability = isStoreCurrentlyOpen(store);

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
      cityId: store.cityId,
      isAvailableInLocation: cityId ? store.cityId === cityId : true,
      isOpen: store.isOpen,
      isCurrentlyOpen: availability.open,
      closedReason: availability.reason,
      closedMessage: availability.open ? null : availability.message,
      products: store.products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        // Return all valid HTTPS URLs — filter out device-local file:// URIs
        // that may have been stored by older vendor app versions without a proper upload step
        images: p.images.filter((url) => url?.startsWith('http')),
        description: p.description,
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

  private mapStoresToVendors(
    stores: (Partial<Store> & { openingHours?: any[] })[],
  ) {
    return stores.map((store) => {
      const availability = isStoreCurrentlyOpen({
        isOpen: store.isOpen ?? true,
        openingHours: store.openingHours ?? [],
        openHours: (store as any).openHours,
      });
      return {
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
        isOpen: store.isOpen ?? true,
        isCurrentlyOpen: availability.open,
        closedReason: availability.reason,
        closedMessage: availability.open ? null : availability.message,
      };
    });
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

  /** Lightweight availability check — no ISR cache, always fresh */
  async getVendorAvailability(identifier: string) {
    const isId = isUUID(identifier);
    const query = isId ? { id: identifier } : { slug: identifier };

    const store = await this.prisma.store.findUnique({
      where: query,
      select: {
        id: true,
        name: true,
        slug: true,
        isOpen: true,
        openHours: true,
        openingHours: true,
      },
    });

    if (!store) return null;

    const availability = isStoreCurrentlyOpen(store);

    return {
      storeId: store.id,
      storeName: store.name,
      isOpen: store.isOpen,
      isCurrentlyOpen: availability.open,
      closedReason: availability.reason,
      closedMessage: availability.open ? null : availability.message,
    };
  }

  async getProductById(idOrSlug: string) {
    const isId = isUUID(idOrSlug);
    const product = await this.prisma.product.findFirst({
      where: isId ? { id: idOrSlug } : { slug: idOrSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        images: true,
        status: true,
        stock: true,
        inventory: true,
        salesCount: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            rating: true,
            ratingCount: true,
          },
        },
        modifierGroups: {
          select: {
            id: true,
            name: true,
            minSelect: true,
            maxSelect: true,
            modifiers: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    // Resolve S3 object keys → signed/CDN URLs; filter out any nulls
    const resolvedImages = (
      await Promise.all(product.images.map((k) => this.resolveImage(k)))
    ).filter((url): url is string => !!url);

    return {
      ...product,
      images:
        resolvedImages.length > 0
          ? resolvedImages
          : ['https://via.placeholder.com/400'],
    };
  }

  /** Returns other active products from the same store, excluding the given product. */
  async getStoreProducts(storeId: string, excludeProductId: string, limit = 8) {
    const products = await this.prisma.product.findMany({
      where: { storeId, id: { not: excludeProductId }, status: 'ACTIVE' },
      take: limit,
      orderBy: { salesCount: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        images: true,
        category: { select: { name: true } },
      },
    });

    return Promise.all(
      products.map(async (p) => ({
        ...p,
        images: (
          await Promise.all(p.images.map((k) => this.resolveImage(k)))
        ).filter((u): u is string => !!u),
      })),
    );
  }

  /** Returns products in the same category, excluding the given product. */
  async getRelatedProducts(
    categoryId: string,
    excludeProductId: string,
    limit = 8,
  ) {
    const products = await this.prisma.product.findMany({
      where: { categoryId, id: { not: excludeProductId }, status: 'ACTIVE' },
      take: limit,
      orderBy: { salesCount: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        images: true,
        store: { select: { id: true, name: true, slug: true } },
        category: { select: { name: true } },
      },
    });

    return Promise.all(
      products.map(async (p) => ({
        ...p,
        images: (
          await Promise.all(p.images.map((k) => this.resolveImage(k)))
        ).filter((u): u is string => !!u),
      })),
    );
  }

  /** Guideline 1.2 — submit a UGC content report */
  async reportContent(
    reporterId: string,
    targetType: 'STORE' | 'REVIEW',
    targetId: string,
    reason: string,
    description?: string,
  ) {
    // Basic duplicate check — one pending report per (user, target) is enough
    const existing = await this.prisma.contentReport.findFirst({
      where: { reporterId, targetType, targetId, status: 'PENDING' },
    });
    if (existing) {
      return { message: 'Report already submitted and under review.' };
    }

    await this.prisma.contentReport.create({
      data: { reporterId, targetType, targetId, reason, description },
    });

    this.logger.log(
      `ContentReport created: ${targetType}/${targetId} by user ${reporterId} — reason: ${reason}`,
    );
    return {
      message:
        'Your report has been submitted. Our team will review it shortly.',
    };
  }

  /**
   * Haversine distance calculation in kilometers.
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getUserDefaultAddress(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
    });
    return (
      addresses.find((a) => a.isDefault) || addresses[0] || null
    );
  }
}
