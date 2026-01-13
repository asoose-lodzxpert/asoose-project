import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  StoreStatus,
  RideStatus,
  DeliveryStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

// DTOs
export interface AnalyticsOverview {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  activeStores: number;
  storesChange: number;
  avgOrderValue: number;
  avgOrderValueChange: number;
}

export interface OrderVolumeDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface GrowthDataPoint {
  month: string;
  stores: number;
  orders: number;
  riders: number;
}

export interface RevenueBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  change: number;
}

export interface RatingsDistribution {
  star: number;
  count: number;
  percentage: number;
}

export interface TopVendor {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  rating: number;
  change: number;
}

export interface AnalyticsReport {
  overview: AnalyticsOverview;
  orderVolume: OrderVolumeDataPoint[];
  growth: GrowthDataPoint[];
  revenueBreakdown: RevenueBreakdownItem[];
  ratings: RatingsDistribution[];
  avgRating: number;
  topVendors: TopVendor[];
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalyticsReport(days: number = 30): Promise<AnalyticsReport> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      overview,
      orderVolume,
      growth,
      revenueBreakdown,
      ratings,
      topVendors,
    ] = await Promise.all([
      this.getOverviewMetrics(startDate),
      this.getOrderVolumeData(startDate),
      this.getGrowthData(),
      this.getRevenueBreakdown(startDate),
      this.getRatingsDistribution(),
      this.getTopVendors(startDate),
    ]);

    const avgRating = await this.getAverageRating();

    return {
      overview,
      orderVolume,
      growth,
      revenueBreakdown,
      ratings,
      avgRating,
      topVendors,
    };
  }

  private async getOverviewMetrics(
    startDate: Date,
  ): Promise<AnalyticsOverview> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [currentOrders, previousOrders, activeStores, previousActiveStores] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: OrderStatus.DELIVERED,
          },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.order.aggregate({
          where: {
            createdAt: { gte: previousStartDate, lt: startDate },
            status: OrderStatus.DELIVERED,
          },
          _sum: { total: true },
          _count: true,
        }),
        this.prisma.store.count({
          where: {
            status: StoreStatus.ACTIVE,
            createdAt: { lte: endDate },
          },
        }),
        this.prisma.store.count({
          where: {
            status: StoreStatus.ACTIVE,
            createdAt: { lt: startDate },
          },
        }),
      ]);

    const totalRevenue = currentOrders._sum.total || 0;
    const previousRevenue = previousOrders._sum.total || 0;
    const totalOrders = currentOrders._count;
    const previousOrderCount = previousOrders._count;

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const previousAvgOrderValue =
      previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    return {
      totalRevenue,
      revenueChange: this.calculatePercentageChange(
        totalRevenue,
        previousRevenue,
      ),
      totalOrders,
      ordersChange: this.calculatePercentageChange(
        totalOrders,
        previousOrderCount,
      ),
      activeStores,
      storesChange: this.calculatePercentageChange(
        activeStores,
        previousActiveStores,
      ),
      avgOrderValue,
      avgOrderValueChange: this.calculatePercentageChange(
        avgOrderValue,
        previousAvgOrderValue,
      ),
    };
  }

  private async getOrderVolumeData(
    startDate: Date,
  ): Promise<OrderVolumeDataPoint[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        orders: bigint;
        revenue: number;
      }>
    >`
  SELECT 
    "createdAt"::date as date, 
    COUNT(*)::bigint as orders, 
    SUM("total")::numeric as revenue
  FROM "Order"
  WHERE "createdAt" >= ${startDate}
    AND status = ${OrderStatus.DELIVERED}
  GROUP BY "createdAt"::date
  ORDER BY date ASC
`;

    return results.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      orders: Number(row.orders),
      revenue: Math.round(Number(row.revenue) * 100) / 100,
    }));
  }

  private async getGrowthData(): Promise<GrowthDataPoint[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [storeGrowth, orderGrowth, riderGrowth] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          month: string;
          count: bigint;
        }>
      >`
        SELECT 
          TO_CHAR("createdAt", 'Mon YYYY') as month,
          COUNT(*)::bigint as count
        FROM "Store"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
      this.prisma.$queryRaw<
        Array<{
          month: string;
          count: bigint;
        }>
      >`
        SELECT 
          TO_CHAR("createdAt", 'Mon YYYY') as month,
          COUNT(*)::bigint as count
        FROM "Order"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
      this.prisma.$queryRaw<
        Array<{
          month: string;
          count: bigint;
        }>
      >`
        SELECT 
          TO_CHAR("createdAt", 'Mon YYYY') as month,
          COUNT(*)::bigint as count
        FROM "RiderProfile"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
        ORDER BY DATE_TRUNC('month', "createdAt") ASC
      `,
    ]);

    const monthMap = new Map<
      string,
      { stores: number; orders: number; riders: number }
    >();

    storeGrowth.forEach((row) => {
      const existing = monthMap.get(row.month) || {
        stores: 0,
        orders: 0,
        riders: 0,
      };
      existing.stores = Number(row.count);
      monthMap.set(row.month, existing);
    });

    orderGrowth.forEach((row) => {
      const existing = monthMap.get(row.month) || {
        stores: 0,
        orders: 0,
        riders: 0,
      };
      existing.orders = Number(row.count);
      monthMap.set(row.month, existing);
    });

    riderGrowth.forEach((row) => {
      const existing = monthMap.get(row.month) || {
        stores: 0,
        orders: 0,
        riders: 0,
      };
      existing.riders = Number(row.count);
      monthMap.set(row.month, existing);
    });

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  private async getRevenueBreakdown(
    startDate: Date,
  ): Promise<RevenueBreakdownItem[]> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [currentBreakdown, previousBreakdown] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          category: string;
          amount: number;
        }>
      >`
        SELECT 
          s.type as category,
          SUM(o.total)::numeric as amount
        FROM "Order" o
        INNER JOIN "Store" s ON o."storeId" = s.id
        WHERE o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${endDate}
          AND o.status = ${OrderStatus.DELIVERED}
        GROUP BY s.type
        ORDER BY amount DESC
      `,
      this.prisma.$queryRaw<
        Array<{
          category: string;
          amount: number;
        }>
      >`
        SELECT 
          s.type as category,
          SUM(o.total)::numeric as amount
        FROM "Order" o
        INNER JOIN "Store" s ON o."storeId" = s.id
        WHERE o."createdAt" >= ${previousStartDate}
          AND o."createdAt" < ${startDate}
          AND o.status = ${OrderStatus.DELIVERED}
        GROUP BY s.type
      `,
    ]);

    const previousMap = new Map(
      previousBreakdown.map((p) => [p.category, Number(p.amount)]),
    );
    const totalRevenue = currentBreakdown.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    return currentBreakdown.map((item) => {
      const amount = Number(item.amount);
      const previousAmount = previousMap.get(item.category) || 0;

      return {
        category: item.category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        change: this.calculatePercentageChange(amount, previousAmount),
      };
    });
  }

  private async getRatingsDistribution(): Promise<RatingsDistribution[]> {
    const results = await this.prisma.$queryRaw<
      Array<{
        rating: number;
        count: bigint;
      }>
    >`
      SELECT 
        rating,
        COUNT(*)::bigint as count
      FROM "Review"
      GROUP BY rating
      ORDER BY rating DESC
    `;

    const totalReviews = results.reduce((sum, r) => sum + Number(r.count), 0);

    const ratingsMap = new Map(results.map((r) => [r.rating, Number(r.count)]));

    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: ratingsMap.get(star) || 0,
      percentage:
        totalReviews > 0
          ? ((ratingsMap.get(star) || 0) / totalReviews) * 100
          : 0,
    }));
  }

  private async getAverageRating(): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(rating)::numeric as avg
      FROM "Review"
    `;

    return Math.round((result[0]?.avg || 0) * 10) / 10;
  }

  private async getTopVendors(
    startDate: Date,
    limit: number = 5,
  ): Promise<TopVendor[]> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const currentTopVendors = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        revenue: number;
        orders: bigint;
        rating: number;
      }>
    >`
      SELECT 
        s.id,
        s.name,
        SUM(o.total)::numeric as revenue,
        COUNT(o.id)::bigint as orders,
        s.rating
      FROM "Store" s
      INNER JOIN "Order" o ON o."storeId" = s.id
      WHERE o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o.status = ${OrderStatus.DELIVERED}
      GROUP BY s.id, s.name, s.rating
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    if (currentTopVendors.length === 0) {
      return [];
    }

    const storeIds = currentTopVendors.map((v) => v.id);

    const previousRevenue = await this.prisma.$queryRaw<
      Array<{
        storeId: string;
        revenue: number;
      }>
    >`
      SELECT 
        "storeId",
        SUM(total)::numeric as revenue
      FROM "Order"
      WHERE "createdAt" >= ${previousStartDate}
        AND "createdAt" < ${startDate}
        AND status = ${OrderStatus.DELIVERED}
        AND "storeId" = ANY(${storeIds})
      GROUP BY "storeId"
    `;

    const previousMap = new Map(
      previousRevenue.map((p) => [p.storeId, Number(p.revenue)]),
    );

    return currentTopVendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      revenue: Math.round(Number(vendor.revenue) * 100) / 100,
      orders: Number(vendor.orders),
      rating: vendor.rating,
      change: this.calculatePercentageChange(
        Number(vendor.revenue),
        previousMap.get(vendor.id) || 0,
      ),
    }));
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  async exportAnalyticsToCSV(days: number = 30): Promise<string> {
    const data = await this.getAnalyticsReport(days);

    let csv = 'Date,Orders,Revenue\n';
    data.orderVolume.forEach((row) => {
      csv += `${row.date},${row.orders},${row.revenue}\n`;
    });

    return csv;
  }
}
