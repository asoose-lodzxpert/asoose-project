import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorService {
  constructor(private readonly prisma: PrismaService) {}

  async getStorePublicDetails(vendorId: string) {
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        banner: true,
        status: true,
        type: true,
        address: true,
        rating: true,
        isOpen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return store;
  }

  async getStoreBalance(vendorId: string) {
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: { balance: true },
    });
    return { amount: store?.balance ?? 0 };
  }

  async getVendorStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    return { status: vendor?.status || 'PENDING' };
  }

  async getVendorActiveStatus(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    const active = store?.status === 'ACTIVE';
    return { active };
  }

  async getStoreMetrics(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store)
      return {
        todaysOrders: 0,
        todaysSales: 0,
        pendingApprovals: 0,
        avgRating: 0,
      };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: today },
      },
    });
    const todaysOrders = orders.length;
    const todaysSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingApprovals = await this.prisma.order.count({
      where: { storeId: store.id, status: 'PENDING' },
    });
    const avgRating = Math.round(store.rating || 0);
    return { todaysOrders, todaysSales, pendingApprovals, avgRating };
  }

  async isStoreOnline(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    return { isOnline: !!store?.isOpen };
  }

  // Toggle store online status
  async toggleStoreOnline(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return { isOnline: false };
    const newIsOpen = !store.isOpen;
    await this.prisma.store.update({
      where: { id: store.id },
      data: { isOpen: newIsOpen },
    });
    return { isOnline: newIsOpen };
  }

  // Get latest 5 orders for store
  async getStoreOrders(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return [];
    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: true,
        items: true,
      },
    });
    return orders.map((order) => ({
      id: order.id,
      customerName: order.user?.name || '',
      customerProfile: order.user?.image || '',
      items: order.items.map((i) => ({
        id: i.id,
        name: i.nameSnap,
        quantity: i.quantity,
      })),
      total: order.total,
      status: order.status.toLowerCase(),
      timestamp: order.createdAt.toISOString(),
    }));
  }
}
