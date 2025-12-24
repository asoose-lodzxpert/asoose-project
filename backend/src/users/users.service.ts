import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateOrderDto } from './dto/create-order.dto';
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

 async getProfile(userId: string, email: string = "") {
    // 1. Try to find the user
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true },
    });

    // 2. If NOT found, create them instantly ("Lazy Sync")
    if (!user) {
      console.log(`[UsersService] User ${userId} missing in DB. Creating now...`);
      
      user = await this.prisma.user.create({
        data: {
          id: userId,
          email: email || `user-${userId.slice(0, 8)}@example.com`, // Fallback if email is missing
          name: 'New User',
          addresses: {
             create: [] 
          }
        },
        include: { addresses: true },
      });
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    console.log(`[UsersService] Updating profile for ${userId}:`, dto); // 👈 LOG 4
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
    });
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    console.log(`[UsersService] Adding address for ${userId}:`, dto); // 👈 LOG 5

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: {
        userId,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        zipCode: dto.zipCode,
        isDefault: dto.isDefault || (await this.prisma.address.count({ where: { userId } })) === 0,
      },
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    console.log(`[UsersService] Deleting address ${addressId} for user ${userId}`); // 👈 LOG 6
    return this.prisma.address.deleteMany({
      where: {
        id: addressId,
        userId: userId, 
      },
    });
  }

  async softDeleteAccount(userId: string) {
    console.log(`[UsersService] Soft deleting account: ${userId}`); // 👈 LOG 7
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });
  }


async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc', 
      },
    });
  }

async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true, 
      }
    });

    if (!order || order.userId !== userId) {
      return null;
    }

    const address = await this.prisma.address.findUnique({
        where: { id: order.addressId }
    });

    return { ...order, addressDetails: address };
  }

async createOrder(userId: string, dto: CreateOrderDto) {
    
    const productIds = dto.items.map((i) => i.id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let totalAmount = 0;
    
    const orderItemsData: { name: string; quantity: number; price: number }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.id);
      if (!product) continue;

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        name: product.name,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const DELIVERY_FEE = 1500;
    const SERVICE_FEE = Math.round(totalAmount * 0.05);
    const FINAL_TOTAL = totalAmount + DELIVERY_FEE + SERVICE_FEE;

   const order = await this.prisma.order.create({
      data: {
        userId,
        total: FINAL_TOTAL, 
        status: 'PENDING',
        addressId: dto.addressId,

        storeId: dto.restaurantId, 
        
        items: {
          create: orderItemsData,
        },
      },
    });

    return order;
  }
}


