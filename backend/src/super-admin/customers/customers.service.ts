import { Injectable, NotFoundException,BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserStatus, UserRole, Prisma, OrderStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus | 'ALL';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, search, status, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.CUSTOMER,
      status: status && status !== 'ALL' ? status : undefined,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = sortBy
      ? { [sortBy]: sortOrder || 'asc' }
      : { createdAt: 'desc' };

    const [customers, total, activeCount, bannedCount, newTodayCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { orders: true } }
        }
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER, status: 'BANNED' } }),
      this.prisma.user.count({ 
        where: { 
          role: UserRole.CUSTOMER, 
          createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } 
        } 
      }),
    ]);

    return {
      data: customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        joinedAt: c.createdAt,
        totalOrders: c._count.orders,
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats: {
        active: activeCount,
        banned: bannedCount,
        newToday: newTodayCount
      }
    };
  }

  async bulkUpdateStatus(ids: string[], status: UserStatus) {
    return this.prisma.user.updateMany({
      where: { 
        id: { in: ids },
        role: UserRole.CUSTOMER
      },
      data: { status }
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
        addresses: true
      }
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const stats = await this.getAggregatedStats(id);

    return {
        ...customer,
        stats
    };
  }

  // FIXED: Corrected field names to match schema.prisma (userId, total, DELIVERED)
  private async getAggregatedStats(userId: string) {
    const [orders, rides] = await Promise.all([
      this.prisma.order.aggregate({
        where: { 
            userId: userId,        // Fixed: customerId -> userId
            status: OrderStatus.DELIVERED // Fixed: 'COMPLETED' -> 'DELIVERED'
        },
        _sum: { total: true },     // Fixed: totalAmount -> total
        _count: { id: true }
      }),
      this.prisma.ride.aggregate({
        where: { customerId: userId, status: 'COMPLETED' },
        _count: { id: true }
      })
    ]);

    return {
      totalOrders: orders._count?.id ?? 0, // Fixed: Added optional chaining and fallback
      totalSpent: orders._sum?.total ?? 0, // Fixed: totalAmount -> total
      totalRides: rides._count?.id ?? 0,   // Fixed: Added optional chaining
    };
  }

  // FIXED: Corrected where clause to use userId
  async getCustomerOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { userId: customerId }, // Fixed: customerId -> userId
      include: {
        store: { select: { name: true, image: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async getCustomerRides(customerId: string) {
    return this.prisma.ride.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status }
    });
  }

  async remove(id: string) {
    const customer = await this.prisma.user.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.user.delete({
      where: { id },
    });
  }

async update(id: string, data: { name?: string; phone?: string; email?: string }) {
    if (data.email) {
      const existing = await this.prisma.user.findUnique({ 
        where: { email: data.email } 
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use by another user');
      }
    }
return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      }
    });
  }

 

}