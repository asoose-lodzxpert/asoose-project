import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Changed to relative path for safety
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
      deletedAt: null,
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

    const [customers, total, activeCount, bannedCount, newTodayCount] =
      await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: { select: { orders: true } },
          },
        }),
        this.prisma.user.count({ where }),

        this.prisma.user.count({
          where: { role: UserRole.CUSTOMER, status: 'ACTIVE', deletedAt: null },
        }),
        this.prisma.user.count({
          where: { role: UserRole.CUSTOMER, status: 'BANNED', deletedAt: null },
        }),
        this.prisma.user.count({
          where: {
            role: UserRole.CUSTOMER,
            deletedAt: null,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
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
        newToday: newTodayCount,
      },
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
        addresses: true,
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const stats = await this.getAggregatedStats(id);

    return {
      ...customer,
      stats,
    };
  }

  async update(
    id: string,
    data: { name?: string; phone?: string; email?: string },
  ) {
    if (data.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email },
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
      },
    });
  }

  //soft delete
  async remove(id: string) {
    const customer = await this.prisma.user.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'BANNED',
        email: `deleted_${Date.now()}_${customer.email}`,
        phone: customer.phone
          ? `deleted_${Date.now()}_${customer.phone}`
          : null,
      },
    });
  }

  async bulkUpdateStatus(ids: string[], status: UserStatus) {
    return this.prisma.user.updateMany({
      where: {
        id: { in: ids },
        role: UserRole.CUSTOMER,
      },
      data: { status },
    });
  }

  async updateStatus(id: string, status: UserStatus, adminId?: string) {
    const customer = await this.prisma.user.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.user.update({
        where: { id },
        data: { status },
      });

      if (adminId) {
        await tx.activityLog.create({
          data: {
            userId: adminId,
            action:
              status === 'ACTIVE'
                ? 'CUSTOMER_REACTIVATED'
                : 'CUSTOMER_STATUS_UPDATE',
            target: id,
            details: `Customer status changed from ${customer.status} to ${status}`,
            metadata: {
              previousStatus: customer.status,
              newStatus: status,
              reason:
                status === 'ACTIVE'
                  ? 'Manual Reactivation (Reverse Kill Switch)'
                  : undefined,
            },
          },
        });
      }

      return updatedCustomer;
    });
  }

  async getCustomerOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        store: { select: { name: true, logo: true } }, // <--- Fixed: Added comma here
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getCustomerRides(customerId: string) {
    return this.prisma.ride.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Helper to calculate total spent and ride counts
  private async getAggregatedStats(userId: string) {
    const [orders, rides] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          userId: userId,
          status: OrderStatus.DELIVERED,
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.ride.aggregate({
        where: { customerId: userId, status: 'COMPLETED' },
        _count: { id: true },
      }),
    ]);

    return {
      totalOrders: orders._count?.id ?? 0,
      totalSpent: orders._sum?.total ?? 0,
      totalRides: rides._count?.id ?? 0,
    };
  }

  async executeKillSwitch(
    customerId: string,
    action: 'SUSPEND' | 'BAN',
    reason: string,
    adminId: string,
  ) {
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const targetStatus =
      action === 'BAN' ? UserStatus.BANNED : UserStatus.SUSPENDED;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: customerId },
        data: {
          status: targetStatus,
          fcmToken: null, // Revoke access
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: `CUSTOMER_EMERGENCY_${action}`,
          target: customerId,
          details: `Emergency ${action} triggered. Reason: ${reason}`,
          metadata: {
            previousStatus: customer.status,
            reason,
            actionType: action,
          },
        },
      });
    });

    return { success: true, message: `Customer has been ${action}ED.` };
  }
}
