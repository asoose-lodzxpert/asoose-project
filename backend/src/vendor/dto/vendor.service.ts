import { Injectable, BadRequestException,UnauthorizedException ,NotFoundException} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStoreDto } from './create-store-dto';
import { CreateProductDto } from './create-product-dto';
@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) {}

async registerStore(userId: string, dto: CreateStoreDto, email: string = "") {
    
    await this.prisma.user.upsert({
        where: { id: userId },
        update: { role: 'VENDOR' }, 
        create: {
            id: userId,
            email: email || `user-${userId.slice(0,6)}@asoose.com`, 
            name: `${dto.name} Owner`,
            role: 'VENDOR'
        }
    });

    const existing = await this.prisma.store.findUnique({
      where: { ownerId: userId },
    });

    if (existing) {
      throw new BadRequestException('You already have a registered store.');
    }

    // 3. CREATE STORE
    return this.prisma.store.create({
      data: {
        name: dto.name,
        address: dto.address,
        type: dto.type,
        deliveryTime: dto.deliveryTime,
        image: dto.image, 
        ownerId: userId   
      },
    });
  }


async getVendorOrders(userId: string) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId }
    });

    if (!store) return []; 

    return this.prisma.order.findMany({
      where: { storeId: store.id },
      include: { items: true, user: true }, 
      orderBy: { createdAt: 'desc' }
    });
  }

async updateOrderStatus(userId: string, orderId: string, newStatus: string) {
    // 1. Find the store
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId }
    });

    if (!store) throw new UnauthorizedException("You do not have a store.");

    // 2. Verify the order belongs to this store
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order || order.storeId !== store.id) {
      throw new UnauthorizedException("This order does not belong to your store.");
    }

    // 3. Update the status
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus as any } 
    });
  }


  async getDashboardStats(userId: string) {
    const store = await this.prisma.store.findUnique({ 
        where: { ownerId: userId },
        include: { orders: true }
    });

    if (!store) return { revenue: 0, pending: 0, completed: 0, totalOrders: 0 };

    // Calculate stats efficiently
    const revenue = store.orders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, o) => sum + o.total, 0);

    const pending = store.orders.filter(o => 
      o.status === 'PENDING' || o.status === 'PROCESSING'
    ).length;

    const completed = store.orders.filter(o => o.status === 'DELIVERED').length;

    return {
      revenue,
      pending,
      completed,
      totalOrders: store.orders.length
    };
  }

  // 2. UPDATE PRODUCT
 async updateProduct(userId: string, productId: string, updates: any) {
    const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
    
    // 👇 ADD THIS CHECK
    if (!store) {
      throw new UnauthorizedException("You do not have a store.");
    }

    // Now TypeScript knows 'store' is not null
    const count = await this.prisma.product.count({
        where: { id: productId, storeId: store.id } // ✅ No more error
    });

    if (count === 0) throw new UnauthorizedException("Product not found or access denied");

    return this.prisma.product.update({
        where: { id: productId },
        data: {
            name: updates.name,
            description: updates.description,
            price: updates.price ? parseFloat(updates.price) : undefined,
            isAvailable: updates.isAvailable,
            image: updates.image
        }
    });
  }

  // 3. DELETE PRODUCT
 async deleteProduct(userId: string, productId: string) {
    const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
    
    // 👇 THIS CHECK IS MANDATORY
    if (!store) {
      throw new UnauthorizedException("You do not have a store.");
    }

    // Safety check: Ensure ownership
    // Now TypeScript knows 'store' exists, so store.id is safe
    const product = await this.prisma.product.findFirst({
        where: { id: productId, storeId: store.id } 
    });
    
    if (!product) throw new NotFoundException("Product not found");

    return this.prisma.product.delete({ where: { id: productId } });
  }

  async getCategories() {
    return this.prisma.category.findMany();
  }



async createProduct(userId: string, dto: CreateProductDto) {
    const store = await this.prisma.store.findUnique({
      where: { ownerId: userId }
    });

    if (!store) {
      throw new UnauthorizedException("You must register a store before adding products.");
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: parseFloat(dto.price.toString()), 
        categoryId: dto.categoryId,
        storeId: store.id, 
        isAvailable: true
      }
    });
  }

}