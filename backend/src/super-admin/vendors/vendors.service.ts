import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  Prisma,
  ProductStatus,
  StoreStatus,
  VerificationStatus,
  UserRole,
  UserStatus,
  StoreType,
} from '@prisma/client';
import { CreateVendorDto, VendorQueryDto } from './dto/vendor.dto';
import { EmailProducer } from '../../mail/email.producer';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { VendorAccountNotificationsService } from 'src/vendor/notifications/vendor-account-notifications.service';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private logService: ActivityLogService,
    private vendorNotificationsService: VendorAccountNotificationsService,
  ) {}

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

  async create(dto: CreateVendorDto) {
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
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

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
   * Updates vendor details and records an audit log.
   */
  async update(id: string, dto: any, adminId: string) {
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

    const updatedStore = await this.prisma.store.update({
      where: { id },
      data: {
        name: dto.storeName || undefined,
        slug: newSlug,
        address: dto.address || undefined,
        status: dto.status || undefined,
        commissionRate:
          dto.commissionRate !== undefined
            ? Number(dto.commissionRate)
            : undefined,
        vendor:
          dto.ownerName || dto.phone || dto.email
            ? {
                update: {
                  name: dto.ownerName || undefined,
                  phone: dto.phone || undefined,
                  email: dto.email || undefined,
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
      ownerName: updatedStore.vendor?.name,
      phone: updatedStore.vendor?.phone,
      email: updatedStore.vendor?.email,
      status: updatedStore.status,
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
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
      totalRevenue,
      commissionRate: store.commissionRate ?? 20,
      unpaidBalance: Math.max(0, totalRevenue - paidOut),
      totalOrders: store.orders.length,
      reviewsCount: store.reviews.length,

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
      price: p.price,
      image: p.images?.[0] || null, // Use first image from array
      category: p.category?.name || 'Uncategorized',
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
}
