import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ProductStatus } from '@prisma/client';
import { 
  Prisma, 
  StoreStatus, 
  VerificationStatus, 
  UserRole, 
  UserStatus, 
  StoreType 
} from '@prisma/client';
import { CreateVendorDto, VendorQueryDto } from './dto/vendor.dto';
import { EmailProducer } from 'src/libs/mail/email.producer';
@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer
  ) {}

  async findAll(query: VendorQueryDto) {
    const { search, status, category, verification, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) where.status = status as StoreStatus;
    if (category) where.type = category as StoreType;
    if (verification) where.verification = verification as VerificationStatus;

    this.logger.log(`Fetching vendors with filters: ${JSON.stringify(where)}`);

    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: {
          owner: { select: { email: true } },
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(skip),
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: stores.map(store => ({
        id: store.id,
        name: store.name,
        email: store.owner?.email ?? 'No Owner',
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
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const where: Prisma.StoreWhereUniqueInput = isUUID 
      ? { id: idOrSlug } 
      : { slug: idOrSlug };

    try {
      const store = await this.prisma.store.findUnique({
        where,
        include: {
          owner: { select: { email: true, phone: true, name: true, status: true } },
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
        throw new NotFoundException(`Store not found (Identifier: ${idOrSlug})`);
      }

      return this.transformStoreDetail(store);

    } catch (error) {
      this.logger.error(`Error in findOne: ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(dto: CreateVendorDto) {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingSlug = await this.prisma.store.findUnique({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictException('Store slug already exists');

    const rawPassword = dto.password || crypto.randomBytes(8).toString('hex') + '!Aa1'; 
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const result = await this.prisma.$transaction(async tx => {
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
          ownerId: user.id,
          status: StoreStatus.PENDING,
          verification: VerificationStatus.PENDING,
          type: dto.type,
        },
        include: { owner: { select: { email: true } } },
      });

      return { user, store };
    });

    this.logger.log('====================================');
    this.logger.log(`[DEV] Vendor Created Successfully`);
    this.logger.log(`Email: ${result.user.email}`);
    this.logger.log(`Password: ${rawPassword}`);
    this.logger.log('====================================');

    return {
      id: result.store.id,
      name: result.store.name,
      message: 'Vendor created successfully',
    };
  }

  async update(id: string, dto: any) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    let newSlug: string | undefined = undefined;
    if (dto.storeName && dto.storeName !== store.name) {
      newSlug = this.generateSlug(dto.storeName);
      
      const existingSlug = await this.prisma.store.findFirst({
        where: { 
          slug: newSlug,
          id: { not: id }
        }
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
        owner: (dto.ownerName || dto.phone || dto.email) ? {
          update: {
            name: dto.ownerName || undefined,
            phone: dto.phone || undefined,
            email: dto.email || undefined,
          }
        } : undefined,
      },
      include: { owner: true }
    });

    return {
      id: updatedStore.id,
      name: updatedStore.name,
      slug: updatedStore.slug,
      address: updatedStore.address,
      ownerName: updatedStore.owner.name,
      phone: updatedStore.owner.phone,
      email: updatedStore.owner.email,
      status: updatedStore.status
    };
  }

  async delete(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Store not found');

    return this.prisma.store.update({
      where: { id },
      data: {
        status: StoreStatus.SUSPENDED, 
        slug: `${store.slug}-deleted-${Date.now()}`,
      },
    });
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
      email: store.owner.email,
      phone: store.owner.phone,
      slug: store.slug,
      ownerName: store.owner.name,
      address: store.address,
      status: store.status,
      verification: store.verification,
      rating: store.rating,
      
      totalRevenue,
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
    // 1. Verify store exists
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Vendor not found');

    // 2. Fetch products
const products = await this.prisma.product.findMany({
      where: { storeId },
      include: {
        category: { select: { name: true } }
      },
      orderBy: [
        { status: 'asc' },
        { salesCount: 'desc' } as any // 👈 Add 'as any' here
      ]
    });

    // 3. Transform for Frontend (Optional: flattens the category object)
return products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      category: p.category?.name || 'Uncategorized',
      status: p.status,
      sales: p.salesCount
    }));
  }

async updateProductStatus(productId: string, status: string) {
    // 1. Validate Status
    // Map frontend "BANNED" to schema "DISABLED" if necessary
    let validStatus: ProductStatus;
    
    if (status === 'BANNED' || status === 'DISABLED') validStatus = ProductStatus.DISABLED;
    else if (status === 'ACTIVE') validStatus = ProductStatus.ACTIVE;
    else if (status === 'OUT_OF_STOCK') validStatus = ProductStatus.OUT_OF_STOCK;
    else throw new Error(`Invalid status: ${status}`);

    // 2. Update Database
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { status: validStatus }
    });

    return product;
  }


  async sendMessageToVendor(storeId: string, message: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true }
    });

    if (!store || !store.owner?.email) {
      throw new NotFoundException('Vendor or Vendor Email not found');
    }

    // Call the producer
    await this.emailProducer.sendVendorMessage(
      store.owner.email,
      `Message from Super Admin - ${store.name}`,
      message
    );

    return { success: true, message: 'Email queued successfully' };
  }

}