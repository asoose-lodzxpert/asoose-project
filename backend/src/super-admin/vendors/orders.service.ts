import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async getVendorOrders(storeId: string, page = 1, limit = 10) {
    // Optimized single query with relation filtering
    const orders = await this.prisma.order.findMany({
      where: { storeId: storeId }, // Direct filter if storeId is passed
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { name: true, email: true } }, // Get customer details
        items: true, // Get items for the UI
      },
    });

    const total = await this.prisma.order.count({
      where: { storeId: storeId },
    });

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }
}