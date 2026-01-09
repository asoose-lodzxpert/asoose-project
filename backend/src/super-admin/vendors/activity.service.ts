import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async getVendorActivityLogs(storeId: string, page = 1, limit = 10) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { vendorId: true },
    });

    if (!store) throw new NotFoundException('Store not found');

    const logs = await this.prisma.activityLog.findMany({
where: { userId: store.vendorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { select: { name: true, role: true } } // Include helpful context
      }
    });

    const total = await this.prisma.activityLog.count({
where: { userId: store.vendorId },
    });

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }
}