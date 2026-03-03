import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async getVendorOrders(storeId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Step 1 — get page of IDs sorted by action-priority then most recent.
    const [orderedRows, total] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT id FROM "Order"
          WHERE "storeId" = ${storeId}
          ORDER BY
            CASE status
              WHEN 'PENDING'   THEN 1
              WHEN 'CONFIRMED' THEN 2
              WHEN 'PREPARING' THEN 3
              WHEN 'READY'     THEN 4
              WHEN 'CANCELLED' THEN 6
              WHEN 'DECLINED'  THEN 6
              ELSE                  5
            END ASC,
            "createdAt" DESC
          LIMIT ${limit} OFFSET ${skip}
        `,
      ),
      this.prisma.order.count({ where: { storeId } }),
    ]);

    // Step 2 — fetch full records with includes.
    const ids = orderedRows.map((r) => r.id);
    const unordered = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        payment: { select: { status: true } },
        orderGroup: { include: { payment: { select: { status: true } } } },
      },
    });

    // Restore the priority order from the raw query.
    const idIndex = new Map(ids.map((id, i) => [id, i]));
    const orders = unordered.sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );

    const data = orders.map((order) => {
      const effectivePayment = order.payment || order.orderGroup?.payment;
      return {
        ...order,
        paymentStatus: effectivePayment?.status || 'UNPAID',
      };
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
