import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { hashPassword } from '../../auth/password-hash.util';
import {
  Prisma,
  ProductStatus,
  StoreStatus,
  VerificationStatus,
  UserRole,
  UserStatus,
  StoreType,
} from '@prisma/client';
import {
  AdminCreateVendorDto,
  ManualOnboardVendorDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import { EmailProducer } from '../../mail/email.producer';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { VendorAccountNotificationsService } from 'src/vendor/notifications/vendor-account-notifications.service';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private logService: ActivityLogService,
    private vendorNotificationsService: VendorAccountNotificationsService,
    private storageService: StorageService,
  ) {}

  /** Returns all product categories, ordered alphabetically. */
  async getAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  /** Returns the valid StoreType enum values (source of truth for store categories). */
  getStoreTypes(): string[] {
    return Object.values(StoreType);
  }

  /** Returns aggregate stats for the vendors dashboard (excludes SUSPENDED/soft-deleted). */
  async getStats() {
    const [total, pending, active, closed] = await Promise.all([
      this.prisma.store.count({
        where: {
          status: { not: StoreStatus.SUSPENDED },
          slug: { not: { contains: '-deleted-' } },
        },
      }),
      this.prisma.store.count({
        where: {
          status: { not: StoreStatus.SUSPENDED },
          verification: VerificationStatus.PENDING,
          slug: { not: { contains: '-deleted-' } },
        },
      }),
      this.prisma.store.count({
        where: {
          status: StoreStatus.ACTIVE,
          slug: { not: { contains: '-deleted-' } },
        },
      }),
      this.prisma.store.count({
        where: {
          status: StoreStatus.CLOSED_PERMANENTLY,
          slug: { not: { contains: '-deleted-' } },
        },
      }),
    ]);

    return { total, pending, active, rejected: closed };
  }

  async findAll(query: VendorQueryDto) {
    const {
      search,
      status,
      category,
      verification,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendor: { email: { contains: search, mode: 'insensitive' } } },
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) where.status = status as StoreStatus;
    if (category) where.type = category as StoreType;
    if (verification) where.verification = verification as VerificationStatus;

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: {
          vendor: { select: { email: true } },
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(skip),
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: stores.map((store) => ({
        id: store.id,
        name: store.name,
        email: store.vendor?.email ?? 'No Owner',
        category: store.type,
        status: store.status,
        verification: store.verification,
        rating: store.rating ?? 0,
        totalOrders: store._count?.orders ?? 0,
        reviews: store._count?.reviews ?? 0,
        createdAt: store.createdAt,
      })),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(idOrSlug: string) {
    this.logger.log(`Fetching store details for identifier: ${idOrSlug}`);

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const where: Prisma.StoreWhereUniqueInput = isUUID
      ? { id: idOrSlug }
      : { slug: idOrSlug };

    try {
      const store = await this.prisma.store.findUnique({
        where,
        include: {
          vendor: {
            select: {
              email: true,
              phone: true,
              name: true,
              status: true,
              image: true,
            },
          },
          orders: {
            include: {
              user: { select: { name: true } },
              items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
          vendorPayouts: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });

      if (!store) {
        throw new NotFoundException(
          `Store not found (Identifier: ${idOrSlug})`,
        );
      }

      return this.transformStoreDetail(store);
    } catch (error: any) {
      this.logger.error(`Error in findOne: ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(dto: AdminCreateVendorDto) {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingSlug = await this.prisma.store.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) throw new ConflictException('Store slug already exists');

    const rawPassword =
      dto.password || crypto.randomBytes(8).toString('hex') + '!Aa1';
    const hashedPassword = await hashPassword(rawPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          phone: dto.phone,
          role: UserRole.VENDOR,
          status: UserStatus.PENDING,
          password: hashedPassword,
        },
      });

      const store = await tx.store.create({
        data: {
          name: dto.storeName,
          slug: dto.slug,
          vendorId: user.id,
          description: `Store for ${dto.storeName}`,
          status: StoreStatus.PENDING,
          verification: VerificationStatus.PENDING,
          type: dto.type,
        },
        include: { vendor: { select: { email: true } } },
      });

      return { user, store };
    });

    return {
      id: result.store.id,
      name: result.store.name,
      message: 'Vendor created successfully',
    };
  }

  /**
   * Manually onboards a vendor as ACTIVE + VERIFIED, skipping the PENDING review flow.
   * Optionally creates initial products in the same transaction.
   */
  async manualOnboard(
    dto: ManualOnboardVendorDto,
    adminId: string,
    files?: { logo?: Express.Multer.File; banner?: Express.Multer.File },
  ) {
    // Normalize email the same way loginVendor does, so lookup always matches
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingEmail = await this.prisma.vendor.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingSlug = await this.prisma.store.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) throw new ConflictException('Store slug already exists');

    const rawPassword =
      'Asoose@' + crypto.randomBytes(6).toString('hex').toUpperCase() + '1!';
    const hashedPassword = await hashPassword(rawPassword);

    // Upload logo / banner if provided
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;
    if (files?.logo) {
      const upload = await this.storageService.uploadFile(files.logo);
      logoUrl = upload.url;
    }
    if (files?.banner) {
      const upload = await this.storageService.uploadFile(files.banner);
      bannerUrl = upload.url;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Store.vendorId references the Vendor model, not User.
      // Create a Vendor record with sensible defaults for required fields.
      const vendor = await tx.vendor.create({
        data: {
          email: normalizedEmail,
          name: dto.name,
          phone: dto.phone || 'N/A',
          countryCode: 'NG',
          businessType: dto.type,
          employees: '1-10',
          password: hashedPassword,
          status: UserStatus.ACTIVE,
        },
      });

      const store = await tx.store.create({
        data: {
          name: dto.storeName,
          slug: dto.slug,
          vendorId: vendor.id,
          description: `Store for ${dto.storeName}`,
          address: dto.address,
          lat: dto.lat,
          lng: dto.lng,
          status: StoreStatus.ACTIVE,
          verification: VerificationStatus.VERIFIED,
          type: dto.type,
          logo: logoUrl,
          banner: bannerUrl,
        },
      });

      let productsCreated = 0;
      if (dto.initialProducts && dto.initialProducts.length > 0) {
        for (const p of dto.initialProducts) {
          const productSlug =
            p.name
              .toLowerCase()
              .trim()
              .replace(/[^\w\s-]/g, '')
              .replace(/[\s_-]+/g, '-')
              .replace(/^-+|-+$/g, '') +
            '-' +
            Math.random().toString(36).substring(2, 6);

          await tx.product.create({
            data: {
              name: p.name,
              slug: productSlug,
              price: p.price,
              description: p.description,
              storeId: store.id,
              categoryId: p.categoryId,
              stock: p.stock ?? 0,
              status: ProductStatus.ACTIVE,
            },
          });
          productsCreated++;
        }
      }

      return { vendor, store, productsCreated };
    });

    await this.logService.record({
      userId: adminId,
      action: 'MANUAL_ONBOARD_VENDOR',
      target: result.store.name,
      details: `Super Admin manually onboarded vendor ${result.store.name} as ACTIVE/VERIFIED with ${result.productsCreated} initial product(s)`,
      metadata: {
        storeId: result.store.id,
        vendorId: result.vendor.id,
        productsCreated: result.productsCreated,
      },
    });

    // Fire-and-forget: send a single branded credentials email
    this.emailProducer
      .sendVendorAccountCreated(
        normalizedEmail,
        dto.name,
        dto.storeName,
        rawPassword,
      )
      .catch((err: any) =>
        this.logger.warn(`Credentials email failed: ${err.message}`),
      );

    return {
      id: result.store.id,
      name: result.store.name,
      slug: result.store.slug,
      status: result.store.status,
      verification: result.store.verification,
      productsCreated: result.productsCreated,
      message: `Vendor manually onboarded successfully with ${result.productsCreated} product(s)`,
    };
  }

  /**
   * Updates vendor details and records an audit log.
   */
  async update(
    id: string,
    dto: any,
    adminId: string,
    files?: { logo?: Express.Multer.File; banner?: Express.Multer.File },
  ) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    let newSlug: string | undefined = undefined;
    if (dto.storeName && dto.storeName !== store.name) {
      newSlug = this.generateSlug(dto.storeName);

      const existingSlug = await this.prisma.store.findFirst({
        where: {
          slug: newSlug,
          id: { not: id },
        },
      });

      if (existingSlug) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
    }

    // Upload logo / banner if provided
    let logoUrl: string | undefined;
    let bannerUrl: string | undefined;
    let vendorImageUrl: string | undefined;

    if (files?.logo) {
      const upload = await this.storageService.uploadFile(files.logo);
      logoUrl = upload.url;
    }
    if (files?.banner) {
      const upload = await this.storageService.uploadFile(files.banner);
      bannerUrl = upload.url;
    }

    // vendorImage: update the vendor (owner) profile image if passed as a URL string
    if (dto.vendorImage) {
      vendorImageUrl = dto.vendorImage;
    }

    const updatedStore = await this.prisma.store.update({
      where: { id },
      data: {
        name: dto.storeName || undefined,
        slug: newSlug,
        address: dto.address || undefined,
        lat: dto.lat !== undefined ? Number(dto.lat) : undefined,
        lng: dto.lng !== undefined ? Number(dto.lng) : undefined,
        status: dto.status || undefined,
        type: dto.storeType && Object.values(StoreType).includes(dto.storeType)
          ? (dto.storeType as StoreType)
          : undefined,
        commissionRate:
          dto.commissionRate !== undefined
            ? Number(dto.commissionRate)
            : undefined,
        logo: logoUrl,
        banner: bannerUrl,
        vendor:
          dto.ownerName || dto.phone || dto.email || vendorImageUrl
            ? {
                update: {
                  name: dto.ownerName || undefined,
                  phone: dto.phone || undefined,
                  email: dto.email || undefined,
                  image: vendorImageUrl,
                },
              }
            : undefined,
      },
      include: { vendor: true },
    });

    // Audit Log for update action
    await this.logService.record({
      userId: adminId,
      action: 'UPDATE_VENDOR',
      target: updatedStore.name,
      details: `Admin modified vendor details for ${updatedStore.name}`,
      metadata: { changes: dto },
    });

    return {
      id: updatedStore.id,
      name: updatedStore.name,
      slug: updatedStore.slug,
      address: updatedStore.address,
      lat: updatedStore.lat,
      lng: updatedStore.lng,
      ownerName: updatedStore.vendor?.name,
      phone: updatedStore.vendor?.phone,
      email: updatedStore.vendor?.email,
      status: updatedStore.status,
      storeType: updatedStore.type,
      logo: updatedStore.logo,
      banner: updatedStore.banner,
    };
  }

  /**
   * Suspends a vendor and records an audit log.
   */
  async delete(id: string, adminId: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    // Audit Log for suspension action
    await this.logService.record({
      userId: adminId,
      action: 'SUSPEND_VENDOR',
      target: store.name,
      status: 'SUSPENDED',
      details: 'Admin performed soft-delete/suspension on vendor',
    });

    const result = await this.prisma.store.update({
      where: { id },
      data: {
        status: StoreStatus.SUSPENDED,
        slug: `${store.slug}-deleted-${Date.now()}`,
      },
    });

    // Notify vendor of store suspension
    try {
      await this.vendorNotificationsService.notifyStoreStatusChange(
        store.vendorId,
        id,
        StoreStatus.SUSPENDED,
        'Your store has been suspended by the admin',
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify vendor of suspension: ${error.message}`,
      );
    }

    return result;
  }

  async getPerformanceData(storeId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        status: 'DELIVERED',
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const groupedData: Record<string, number> = {};
    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      groupedData[dateKey] = (groupedData[dateKey] || 0) + Number(order.total);
    });

    const finalData: { date: string; revenue: number }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateString = d.toISOString().split('T')[0];

      finalData.push({
        date: dateString,
        revenue: groupedData[dateString] || 0,
      });
    }

    return finalData;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private transformStoreDetail(store: any) {
    const totalRevenue = store.orders
      .filter((o: any) => o.status === 'DELIVERED')
      .reduce((sum: number, o: any) => sum + Number(o.total), 0);

    const paidOut = store.vendorPayouts
      .filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return {
      id: store.id,
      name: store.name,
      email: store.vendor?.email,
      phone: store.vendor?.phone,
      slug: store.slug,
      ownerName: store.vendor?.name,
      address: store.address,
      status: store.status,
      verification: store.verification,
      rating: store.rating,
      image: store.logo || store.vendor?.image || null,
      logo: store.logo,
      banner: store.banner,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      totalRevenue,
      storeType: store.type,
      commissionRate: store.commissionRate ?? 20,
      unpaidBalance: Math.max(0, totalRevenue - paidOut),
      totalOrders: store.orders.length,
      reviewsCount: store.reviews.length,
      isAdminManaged: store.isAdminManaged ?? false,

      orders: store.orders.map((order: any) => ({
        id: order.id,
        date: order.createdAt,
        customer: order.user?.name || 'Guest',
        status: order.status,
        total: order.total,
        itemsCount: order.items?.length || 0,
      })),

      reviews: store.reviews.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),

      payouts: store.vendorPayouts,
    };
  }

  /**
   * Admin creates a product for any vendor's store, bypassing ownership checks.
   * Accepts an optional uploaded image file; falls back to images[] in dto.
   * Optionally creates modifier groups (with modifiers) attached to the product.
   */
  async adminCreateProduct(
    storeId: string,
    dto: {
      name: string;
      description?: string;
      price: number;
      stock?: number;
      categoryId: string;
      modifierGroups?: Array<{
        name: string;
        minSelect?: number;
        maxSelect?: number;
        modifiers: Array<{ name: string; price: number }>;
      }>;
    },
    adminId: string,
    file?: Express.Multer.File,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    if (!dto.name?.trim())
      throw new BadRequestException('Product name is required');
    if (!dto.categoryId) throw new BadRequestException('Category is required');
    if (dto.price == null || isNaN(Number(dto.price)) || Number(dto.price) < 0)
      throw new BadRequestException('Price must be a non-negative number');

    // Upload image if provided
    let images: string[] = [];
    if (file) {
      const upload = await this.storageService.uploadFile(file);
      images = [upload.url];
    }

    // Generate unique slug
    const baseSlug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${baseSlug}-${Date.now()}`;

    const product = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim(),
        price: Number(dto.price),
        stock: dto.stock != null ? Number(dto.stock) : 0,
        images,
        storeId,
        categoryId: dto.categoryId,
        status: ProductStatus.ACTIVE,
      },
      include: { category: { select: { name: true } } },
    });

    // Create modifier groups if provided
    if (dto.modifierGroups && dto.modifierGroups.length > 0) {
      for (const group of dto.modifierGroups) {
        if (!group.name?.trim()) continue;
        await this.prisma.modifierGroup.create({
          data: {
            productId: product.id,
            name: group.name.trim(),
            minSelect: group.minSelect ?? 0,
            maxSelect: group.maxSelect ?? 1,
            modifiers: {
              create: (group.modifiers ?? [])
                .filter((m) => m.name?.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  price: Number(m.price) || 0,
                })),
            },
          },
        });
      }
    }

    await this.logService.record({
      userId: adminId,
      action: 'ADMIN_CREATE_PRODUCT',
      target: product.name,
      details: `Admin added product "${product.name}" to store ${store.name}`,
      metadata: { productId: product.id, storeId },
    });

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || null,
      category: (product as any).category?.name || 'Uncategorized',
      status: product.status,
      stock: product.stock,
    };
  }

  /**
   * Admin updates any product fields (name, description, price, stock,
   * categoryId, image, modifierGroups). Modifier groups are replaced in full
   * when provided.
   */
  async adminUpdateProduct(
    productId: string,
    dto: {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      categoryId?: string;
      modifierGroups?: Array<{
        name: string;
        minSelect?: number;
        maxSelect?: number;
        modifiers: Array<{ name: string; price: number }>;
      }>;
    },
    adminId: string,
    file?: Express.Multer.File,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Upload new image if provided
    let images: string[] | undefined;
    if (file) {
      const upload = await this.storageService.uploadFile(file);
      images = [upload.url];
    }

    const updateData: any = {};
    if (dto.name?.trim()) updateData.name = dto.name.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() ?? null;
    if (dto.price != null && !isNaN(Number(dto.price)))
      updateData.price = Number(dto.price);
    if (dto.stock != null && !isNaN(Number(dto.stock)))
      updateData.stock = Number(dto.stock);
    if (dto.categoryId) updateData.categoryId = dto.categoryId;
    if (images) updateData.images = images;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { category: { select: { name: true } } },
    });

    // Replace modifier groups if provided
    if (dto.modifierGroups !== undefined) {
      await this.prisma.modifierGroup.deleteMany({ where: { productId } });
      for (const group of dto.modifierGroups) {
        if (!group.name?.trim()) continue;
        await this.prisma.modifierGroup.create({
          data: {
            productId,
            name: group.name.trim(),
            minSelect: group.minSelect ?? 0,
            maxSelect: group.maxSelect ?? 1,
            modifiers: {
              create: (group.modifiers ?? [])
                .filter((m) => m.name?.trim())
                .map((m) => ({
                  name: m.name.trim(),
                  price: Number(m.price) || 0,
                })),
            },
          },
        });
      }
    }

    await this.logService.record({
      userId: adminId,
      action: 'ADMIN_UPDATE_PRODUCT',
      target: updated.name,
      details: `Admin updated product "${updated.name}" in store ${(product as any).store?.name}`,
      metadata: { productId, storeId: product.storeId },
    });

    return {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      image: updated.images?.[0] || null,
      category: (updated as any).category?.name || 'Uncategorized',
      status: updated.status,
      stock: updated.stock,
    };
  }

  async getVendorProducts(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Vendor not found');

    const products = await this.prisma.product.findMany({
      where: { storeId },
      include: {
        category: { select: { name: true } },
      },
      orderBy: [{ status: 'asc' }, { salesCount: 'desc' } as any],
    });

    return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      stock: p.stock ?? 0,
      image: p.images?.[0] || null, // Use first image from array
      category: p.category?.name || 'Uncategorized',
      categoryId: p.categoryId,
      status: p.status,
      sales: p.salesCount,
    }));
  }

  async updateProductStatus(productId: string, status: string) {
    let validStatus: ProductStatus;

    if (status === 'BANNED' || status === 'DISABLED')
      validStatus = ProductStatus.DISABLED;
    else if (status === 'ACTIVE') validStatus = ProductStatus.ACTIVE;
    else if (status === 'OUT_OF_STOCK')
      validStatus = ProductStatus.OUT_OF_STOCK;
    else throw new Error(`Invalid status: ${status}`);

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { status: validStatus },
    });

    // Notify vendor of product status change
    try {
      const productWithStore = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { store: true },
      });

      if (productWithStore) {
        // Only notify for APPROVED or REJECTED
        let notifyStatus: 'APPROVED' | 'REJECTED' | null = null;
        let rejectionReason: string | undefined = undefined;
        if (validStatus === ProductStatus.ACTIVE) {
          notifyStatus = 'APPROVED';
        } else if (validStatus === ProductStatus.DISABLED) {
          notifyStatus = 'REJECTED';
          rejectionReason = 'Product has been banned by admin';
        }
        if (notifyStatus) {
          await this.vendorNotificationsService.notifyProductStatusChange(
            productWithStore.store.vendorId,
            productId,
            product.name,
            notifyStatus,
            rejectionReason,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify vendor of product status change: ${error.message}`,
      );
    }

    return product;
  }

  async sendMessageToVendor(storeId: string, message: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { vendor: true },
    });

    if (!store || !store.vendor?.email) {
      throw new NotFoundException('Vendor or Vendor Email not found');
    }

    await this.emailProducer.sendVendorMessage(
      store.vendor.email,
      `Message from Super Admin - ${store.name}`,
      message,
    );

    return { success: true, message: 'Email queued successfully' };
  }
  async getVendorPayouts(storeId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vendorPayout.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where: { storeId } }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorDocuments(storeId: string, page = 1, limit = 10) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { vendorId: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vendorDocument.findMany({
        where: { vendorId: store.vendorId },
        orderBy: { uploadedDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorDocument.count({ where: { vendorId: store.vendorId } }),
    ]);

    return {
      data: data.map((d) => ({
        id: d.id,
        name: d.name,
        fileName: d.fileName,
        url: d.url,
        status: d.status,
        uploadedDate: d.uploadedDate,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorActivity(storeId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.storeLog.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.storeLog.count({ where: { storeId } }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        user: log.performedBy || 'System',
        timestamp: log.createdAt,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorReviews(storeId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true } } },
      }),
      this.prisma.review.count({ where: { storeId } }),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        user: r.user?.name || 'Anonymous',
        rating: r.rating,
        comment: r.comment || '',
        date: r.createdAt,
        orderId: '',
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async setAdminManaged(
    storeId: string,
    isAdminManaged: boolean,
    adminId: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    const updated = await this.prisma.store.update({
      where: { id: storeId },
      data: { isAdminManaged },
      select: { id: true, name: true, isAdminManaged: true },
    });

    await this.logService.record({
      userId: adminId,
      action: isAdminManaged
        ? 'STORE_ADMIN_MANAGED_ON'
        : 'STORE_ADMIN_MANAGED_OFF',
      target: store.name,
      details: `Admin ${isAdminManaged ? 'enabled' : 'disabled'} admin-managed mode for store ${store.name}`,
      metadata: { storeId, isAdminManaged },
    });

    return updated;
  }
}
