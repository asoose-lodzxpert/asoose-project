import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async getVendorOrders(storeId: string, page = 1, limit = 10) {
    const orders = await this.prisma.order.findMany({
      where: { storeId: storeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        // FIX: Include Payment context
        payment: { select: { status: true } },
        orderGroup: { include: { payment: { select: { status: true } } } },
      },
    });

    const total = await this.prisma.order.count({
      where: { storeId: storeId },
    });

    const transformed = orders.map((order) => {
      const effectivePayment = order.payment || order.orderGroup?.payment;
      return {
        ...order,
        paymentStatus: effectivePayment?.status || 'UNPAID',
      };
    });

    return {
      data: transformed,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
