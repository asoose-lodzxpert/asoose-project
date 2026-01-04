import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, StoreStatus, RideStatus, DeliveryStatus } from '@prisma/client';
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
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive analytics report
   */
  async getAnalyticsReport(days: number = 30): Promise<AnalyticsReport> {
    this.logger.log(`Generating analytics report for last ${days} days`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
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
    } catch (error) {
      this.logger.error('Failed to generate analytics report', error);
      throw error;
    }
  }

  /**
   * Calculate overview metrics with period-over-period comparison
   */
  private async getOverviewMetrics(startDate: Date): Promise<AnalyticsOverview> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    // Current period metrics
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
      revenueChange: this.calculatePercentageChange(totalRevenue, previousRevenue),
      totalOrders,
      ordersChange: this.calculatePercentageChange(totalOrders, previousOrderCount),
      activeStores,
      storesChange: this.calculatePercentageChange(activeStores, previousActiveStores),
      avgOrderValue,
      avgOrderValueChange: this.calculatePercentageChange(
        avgOrderValue,
        previousAvgOrderValue
      ),
    };
  }

  /**
   * Get daily order volume and revenue data
   */
  private async getOrderVolumeData(startDate: Date): Promise<OrderVolumeDataPoint[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: OrderStatus.DELIVERED,
      },
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dataMap = new Map<string, { orders: number; revenue: number }>();

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      const existing = dataMap.get(date) || { orders: 0, revenue: 0 };
      dataMap.set(date, {
        orders: existing.orders + 1,
        revenue: existing.revenue + order.total,
      });
    });

    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get growth trends by month (last 6 months)
   */
  private async getGrowthData(): Promise<GrowthDataPoint[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [stores, orders, riders] = await Promise.all([
      this.prisma.store.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.riderProfile.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
    ]);

    const monthMap = new Map<string, { stores: number; orders: number; riders: number }>();

    const processData = (items: { createdAt: Date }[], key: 'stores' | 'orders' | 'riders') => {
      items.forEach((item) => {
        const month = item.createdAt.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        const existing = monthMap.get(month) || { stores: 0, orders: 0, riders: 0 };
        existing[key]++;
        monthMap.set(month, existing);
      });
    };

    processData(stores, 'stores');
    processData(orders, 'orders');
    processData(riders, 'riders');

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  /**
   * Get revenue breakdown by store type with historical comparison
   */
  private async getRevenueBreakdown(startDate: Date): Promise<RevenueBreakdownItem[]> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    // 1. Fetch current and previous period breakdowns
    const [currentBreakdown, previousBreakdown] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['storeId'],
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: OrderStatus.DELIVERED,
        },
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['storeId'],
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
          status: OrderStatus.DELIVERED,
        },
        _sum: { total: true },
      }),
    ]);

    // 2. Identify all relevant store IDs to fetch their types
    const storeIds = new Set([
      ...currentBreakdown.map((b) => b.storeId),
      ...previousBreakdown.map((b) => b.storeId),
    ]);

    if (storeIds.size === 0) {
      return [];
    }

    const stores = await this.prisma.store.findMany({
      where: { id: { in: Array.from(storeIds) } },
      select: { id: true, type: true },
    });

    const storeTypeMap = new Map(stores.map((s) => [s.id, s.type]));

    // 3. Helper to aggregate revenue by store type
    const aggregateByType = (data: typeof currentBreakdown) => {
      const typeRevenue = new Map<string, number>();
      data.forEach((item) => {
        const type = storeTypeMap.get(item.storeId) || 'OTHER';
        const current = typeRevenue.get(type) || 0;
        typeRevenue.set(type, current + (item._sum.total || 0));
      });
      return typeRevenue;
    };

    const currentTypeRevenue = aggregateByType(currentBreakdown);
    const previousTypeRevenue = aggregateByType(previousBreakdown);

    // 4. Calculate total revenue for percentage calculation
    const totalRevenue = Array.from(currentTypeRevenue.values()).reduce((a, b) => a + b, 0);

    // 5. Build response with change metrics
    return Array.from(currentTypeRevenue.entries()).map(([category, amount]) => {
      const previousAmount = previousTypeRevenue.get(category) || 0;
      return {
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
        change: this.calculatePercentageChange(amount, previousAmount),
      };
    }).sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get ratings distribution across all stores
   */
  private async getRatingsDistribution(): Promise<RatingsDistribution[]> {
    const reviews = await this.prisma.review.groupBy({
      by: ['rating'],
      _count: { rating: true },
    });

    const totalReviews = reviews.reduce((sum, r) => sum + r._count.rating, 0);

    return [5, 4, 3, 2, 1].map((star) => {
      const found = reviews.find((r) => r.rating === star);
      const count = found?._count.rating || 0;
      return {
        star,
        count,
        percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
      };
    });
  }

  /**
   * Calculate average rating
   */
  private async getAverageRating(): Promise<number> {
    const result = await this.prisma.review.aggregate({
      _avg: { rating: true },
    });
    return Math.round((result._avg.rating || 0) * 10) / 10;
  }

  /**
   * Get top performing vendors for the specified period with historical comparison
   */
  private async getTopVendors(startDate: Date, limit: number = 5): Promise<TopVendor[]> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    // 1. Calculate revenue per store for the CURRENT period
    const currentPeriodStats = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: OrderStatus.DELIVERED,
      },
      _sum: { total: true },
      _count: { _all: true },
    });

    if (currentPeriodStats.length === 0) {
      return [];
    }

    // 2. Sort stores by revenue in descending order and slice
    const topStoreStats = currentPeriodStats
      .map((item) => ({
        storeId: item.storeId,
        revenue: item._sum.total || 0,
        orders: item._count._all || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const topStoreIds = topStoreStats.map((s) => s.storeId);

    // 3. Fetch Store Details and Previous Period Revenue in parallel
    const [storesDetails, previousPeriodStats] = await Promise.all([
      this.prisma.store.findMany({
        where: { id: { in: topStoreIds } },
        select: { id: true, name: true, rating: true },
      }),
      this.prisma.order.groupBy({
        by: ['storeId'],
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
          status: OrderStatus.DELIVERED,
          storeId: { in: topStoreIds },
        },
        _sum: { total: true },
      }),
    ]);

    // 4. Map for easy lookup
    const previousRevenueMap = new Map(
      previousPeriodStats.map((p) => [p.storeId, p._sum.total || 0])
    );
    const storeDetailsMap = new Map(storesDetails.map((s) => [s.id, s]));

    // 5. Build final result preserving the sorted order
    return topStoreStats
      .map((stat) => {
        const store = storeDetailsMap.get(stat.storeId);
        if (!store) return null;

        const previousRevenue = previousRevenueMap.get(stat.storeId) || 0;

        return {
          id: store.id,
          name: store.name,
          revenue: Math.round(stat.revenue * 100) / 100,
          orders: stat.orders,
          rating: store.rating,
          change: this.calculatePercentageChange(stat.revenue, previousRevenue),
        };
      })
      .filter((item): item is TopVendor => item !== null);
  }

  /**
   * Helper: Calculate percentage change
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  /**
   * Export analytics data to CSV
   */
  async exportAnalyticsToCSV(days: number = 30): Promise<string> {
    const data = await this.getAnalyticsReport(days);
    
    // Simple CSV generation for orders
    let csv = 'Date,Orders,Revenue\n';
    data.orderVolume.forEach((row) => {
      csv += `${row.date},${row.orders},${row.revenue}\n`;
    });
    
    return csv;
  }
}