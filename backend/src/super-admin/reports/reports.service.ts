import { Injectable } from '@nestjs/common';
import { StoreStatus, Prisma } from '@prisma/client';
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
  // New: platform-wide totals
  totalRides: number;
  ridesChange: number;
  totalDeliveries: number;
  deliveriesChange: number;
  rideRevenue: number;
  deliveryRevenue: number;
  platformRevenue: number; // orders + rides + deliveries combined
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
  rides: number;
  deliveries: number;
  newUsers: number;
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

export interface RideMetrics {
  total: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  revenue: number;
  avgFare: number;
  avgDurationMin: number;
  avgDistanceKm: number;
  revenueChange: number;
  countChange: number;
}

export interface DeliveryMetrics {
  total: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  revenue: number;
  avgFee: number;
  avgDistanceKm: number;
  revenueChange: number;
  countChange: number;
}

export interface PayoutSummary {
  vendorPayoutsPending: number;
  vendorPayoutsPaid: number;
  riderPayoutsPending: number;
  riderPayoutsPaid: number;
  totalPendingPayouts: number;
  totalPaidPayouts: number;
}

export interface UserBreakdown {
  totalActive: number;
  customers: number;
  vendors: number;
  riders: number;
  admins: number;
  newThisPeriod: number;
  newPreviousPeriod: number;
  growth: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DisputeMetrics {
  open: number;
  resolved: number;
  total: number;
  resolutionRate: number;
  byCategory: Array<{ reason: string; count: number }>;
}

export interface AnalyticsReport {
  overview: AnalyticsOverview;
  orderVolume: OrderVolumeDataPoint[];
  growth: GrowthDataPoint[];
  revenueBreakdown: RevenueBreakdownItem[];
  ratings: RatingsDistribution[];
  avgRating: number;
  topVendors: TopVendor[];
  rides: RideMetrics;
  deliveries: DeliveryMetrics;
  payouts: PayoutSummary;
  users: UserBreakdown;
  paymentMethods: PaymentMethodBreakdown[];
  disputes: DisputeMetrics;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalyticsReport(days: number = 30): Promise<AnalyticsReport> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Determine granularity based on days (Backend Logic)
    let granularity: 'day' | 'week' | 'month' = 'day';
    if (days > 30 && days <= 90) granularity = 'week';
    if (days > 90) granularity = 'month';

    const [
      overview,
      orderVolume,
      growth,
      revenueBreakdown,
      ratings,
      topVendors,
      rides,
      deliveries,
      payouts,
      users,
      paymentMethods,
      disputes,
    ] = await Promise.all([
      this.getOverviewMetrics(startDate),
      this.getOrderVolumeData(startDate, granularity),
      this.getGrowthData(),
      this.getRevenueBreakdown(startDate),
      this.getRatingsDistribution(),
      this.getTopVendors(startDate),
      this.getRideMetrics(startDate),
      this.getDeliveryMetrics(startDate),
      this.getPayoutSummary(),
      this.getUserBreakdown(startDate),
      this.getPaymentMethodBreakdown(startDate),
      this.getDisputeMetrics(),
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
      rides,
      deliveries,
      payouts,
      users,
      paymentMethods,
      disputes,
    };
  }

  private async getOverviewMetrics(
    startDate: Date,
  ): Promise<AnalyticsOverview> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [
      currentOrders,
      previousOrders,
      activeStores,
      previousActiveStores,
      currentRides,
      previousRides,
      currentDeliveries,
      previousDeliveries,
      rideRevenue,
      deliveryRevenue,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate }, paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, paymentStatus: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.store.count({
        where: { status: StoreStatus.ACTIVE, createdAt: { lte: endDate } },
      }),
      this.prisma.store.count({
        where: { status: StoreStatus.ACTIVE, createdAt: { lt: startDate } },
      }),
      this.prisma.ride.count({
        where: { createdAt: { gte: startDate, lte: endDate }, status: 'COMPLETED' },
      }),
      this.prisma.ride.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, status: 'COMPLETED' },
      }),
      this.prisma.delivery.count({
        where: { createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' },
      }),
      this.prisma.delivery.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, status: 'DELIVERED' },
      }),
      this.prisma.ride.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
          totalFare: { not: null },
        },
        _sum: { totalFare: true },
      }),
      this.prisma.delivery.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' },
        _sum: { deliveryFee: true },
      }),
    ]);

    const totalRevenue = Number(currentOrders._sum.total || 0);
    const previousRevenue = Number(previousOrders._sum.total || 0);
    const totalOrders = currentOrders._count;
    const previousOrderCount = previousOrders._count;
    const rideRev = Number(rideRevenue._sum.totalFare || 0);
    const deliveryRev = Number(deliveryRevenue._sum.deliveryFee || 0);

    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const previousAvgOrderValue =
      previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    return {
      totalRevenue: this.toTwoDecimals(totalRevenue),
      revenueChange: this.calculatePercentageChange(totalRevenue, previousRevenue),
      totalOrders,
      ordersChange: this.calculatePercentageChange(totalOrders, previousOrderCount),
      activeStores,
      storesChange: this.calculatePercentageChange(activeStores, previousActiveStores),
      avgOrderValue: this.toTwoDecimals(avgOrderValue),
      avgOrderValueChange: this.calculatePercentageChange(avgOrderValue, previousAvgOrderValue),
      totalRides: currentRides,
      ridesChange: this.calculatePercentageChange(currentRides, previousRides),
      totalDeliveries: currentDeliveries,
      deliveriesChange: this.calculatePercentageChange(currentDeliveries, previousDeliveries),
      rideRevenue: this.toTwoDecimals(rideRev),
      deliveryRevenue: this.toTwoDecimals(deliveryRev),
      platformRevenue: this.toTwoDecimals(totalRevenue + rideRev + deliveryRev),
    };
  }

  private async getOrderVolumeData(
    startDate: Date,
    granularity: 'day' | 'week' | 'month',
  ): Promise<OrderVolumeDataPoint[]> {
    // Switch SQL grouping based on granularity
    let truncType = 'day';
    if (granularity === 'week') truncType = 'week';
    if (granularity === 'month') truncType = 'month';

    const results = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        orders: bigint;
        revenue: number;
      }>
    >`
      SELECT 
        DATE_TRUNC(${Prisma.raw(`'${truncType}'`)}, "createdAt")::date as date, 
        COUNT(*)::bigint as orders, 
        SUM("total")::numeric as revenue
      FROM "Order"
      WHERE "createdAt" >= ${startDate}
        AND "paymentStatus" = 'PAID'
      GROUP BY DATE_TRUNC(${Prisma.raw(`'${truncType}'`)}, "createdAt")
      ORDER BY date ASC
    `;

    return results.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      orders: Number(row.orders),
      revenue: this.toTwoDecimals(Number(row.revenue)),
    }));
  }

  private async getGrowthData(): Promise<GrowthDataPoint[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [storeGrowth, orderGrowth, riderGrowth, rideGrowth, deliveryGrowth, userGrowth] =
      await Promise.all([
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "Store" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
        // FIX: filter to paid orders only so cancelled orders don't inflate the chart
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "Order" WHERE "createdAt" >= ${sixMonthsAgo} AND "paymentStatus" = 'PAID'
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "Rider" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "Ride" WHERE "createdAt" >= ${sixMonthsAgo} AND status = 'COMPLETED'
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "Delivery" WHERE "createdAt" >= ${sixMonthsAgo} AND status = 'DELIVERED'
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
        this.prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("createdAt", 'Mon YYYY') as month, COUNT(*)::bigint as count,
            DATE_TRUNC('month', "createdAt") as sort_date
          FROM "User" WHERE "createdAt" >= ${sixMonthsAgo}
          GROUP BY TO_CHAR("createdAt", 'Mon YYYY'), DATE_TRUNC('month', "createdAt")
          ORDER BY sort_date ASC
        `,
      ]);

    const monthMap = new Map<
      string,
      { stores: number; orders: number; riders: number; rides: number; deliveries: number; newUsers: number }
    >();

    const processGrowth = (
      data: Array<{ month: string; count: bigint }>,
      key: 'stores' | 'orders' | 'riders' | 'rides' | 'deliveries' | 'newUsers',
    ) => {
      data.forEach((row) => {
        const existing = monthMap.get(row.month) || {
          stores: 0, orders: 0, riders: 0, rides: 0, deliveries: 0, newUsers: 0,
        };
        existing[key] = Number(row.count);
        monthMap.set(row.month, existing);
      });
    };

    processGrowth(storeGrowth, 'stores');
    processGrowth(orderGrowth, 'orders');
    processGrowth(riderGrowth, 'riders');
    processGrowth(rideGrowth, 'rides');
    processGrowth(deliveryGrowth, 'deliveries');
    processGrowth(userGrowth, 'newUsers');

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
      this.prisma.$queryRaw<Array<{ category: string; amount: number }>>`
        SELECT 
          s.type as category,
          SUM(o.total)::numeric as amount
        FROM "Order" o
        INNER JOIN "Store" s ON o."storeId" = s.id
        WHERE o."createdAt" >= ${startDate}
          AND o."createdAt" <= ${endDate}
          AND o."paymentStatus" = 'PAID'
        GROUP BY s.type
        ORDER BY amount DESC
      `,
      this.prisma.$queryRaw<Array<{ category: string; amount: number }>>`
        SELECT 
          s.type as category,
          SUM(o.total)::numeric as amount
        FROM "Order" o
        INNER JOIN "Store" s ON o."storeId" = s.id
        WHERE o."createdAt" >= ${previousStartDate}
          AND o."createdAt" < ${startDate}
          AND o."paymentStatus" = 'PAID'
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
        amount: this.toTwoDecimals(amount),
        percentage:
          totalRevenue > 0
            ? this.toTwoDecimals((amount / totalRevenue) * 100)
            : 0,
        change: this.calculatePercentageChange(amount, previousAmount),
      };
    });
  }

  private async getRatingsDistribution(): Promise<RatingsDistribution[]> {
    const results = await this.prisma.$queryRaw<
      Array<{ rating: number; count: bigint }>
    >`
      SELECT rating, COUNT(*)::bigint as count
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
          ? this.toTwoDecimals(
              ((ratingsMap.get(star) || 0) / totalReviews) * 100,
            )
          : 0,
    }));
  }

  private async getAverageRating(): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(rating)::numeric as avg
      FROM "Review"
    `;

    return this.toOneDecimal(Number(result[0]?.avg || 0));
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
        s.id, s.name, SUM(o.total)::numeric as revenue, COUNT(o.id)::bigint as orders, s.rating
      FROM "Store" s
      INNER JOIN "Order" o ON o."storeId" = s.id
      WHERE o."createdAt" >= ${startDate}
        AND o."createdAt" <= ${endDate}
        AND o."paymentStatus" = 'PAID'
      GROUP BY s.id, s.name, s.rating
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    if (currentTopVendors.length === 0) return [];

    const storeIds = currentTopVendors.map((v) => v.id);

    const previousRevenue = await this.prisma.$queryRaw<
      Array<{ storeId: string; revenue: number }>
    >`
      SELECT "storeId", SUM(total)::numeric as revenue
      FROM "Order"
      WHERE "createdAt" >= ${previousStartDate}
        AND "createdAt" < ${startDate}
        AND "paymentStatus" = 'PAID'
        AND "storeId" = ANY(${storeIds})
      GROUP BY "storeId"
    `;

    const previousMap = new Map(
      previousRevenue.map((p) => [p.storeId, Number(p.revenue)]),
    );

    return currentTopVendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      revenue: this.toTwoDecimals(Number(vendor.revenue)),
      orders: Number(vendor.orders),
      rating: this.toOneDecimal(Number(vendor.rating)),
      change: this.calculatePercentageChange(
        Number(vendor.revenue),
        previousMap.get(vendor.id) || 0,
      ),
    }));
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const change = ((current - previous) / previous) * 100;
    // Guard against Infinity/NaN
    if (!Number.isFinite(change)) return 0;
    return this.toTwoDecimals(change);
  }

  private toTwoDecimals(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private toOneDecimal(val: number): number {
    return Math.round((val + Number.EPSILON) * 10) / 10;
  }

  // ==================== NEW DOMAIN METRICS ====================

  private async getRideMetrics(startDate: Date): Promise<RideMetrics> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [current, previous, avgStats] = await Promise.all([
      this.prisma.ride.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      this.prisma.ride.aggregate({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, status: 'COMPLETED' },
        _count: true,
        _sum: { totalFare: true },
      }),
      this.prisma.ride.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        _count: true,
        _sum: { totalFare: true },
        _avg: { totalFare: true, durationMin: true, distanceKm: true },
      }),
    ]);

    const total = current.reduce((s, g) => s + g._count, 0);
    const completed = current.find((g) => g.status === 'COMPLETED')?._count || 0;
    const cancelled = current
      .filter((g) => ['CANCELLED', 'CANCELLED_BY_USER', 'CANCELLED_BY_DRIVER'].includes(g.status))
      .reduce((s, g) => s + g._count, 0);

    const revenue = Number(avgStats._sum.totalFare || 0);
    const prevRevenue = Number(previous._sum.totalFare || 0);
    const prevCount = previous._count;

    return {
      total,
      completed,
      cancelled,
      completionRate: total > 0 ? this.toTwoDecimals((completed / total) * 100) : 0,
      revenue: this.toTwoDecimals(revenue),
      avgFare: this.toTwoDecimals(Number(avgStats._avg.totalFare || 0)),
      avgDurationMin: this.toTwoDecimals(Number(avgStats._avg.durationMin || 0)),
      avgDistanceKm: this.toTwoDecimals(Number(avgStats._avg.distanceKm || 0)),
      revenueChange: this.calculatePercentageChange(revenue, prevRevenue),
      countChange: this.calculatePercentageChange(completed, prevCount),
    };
  }

  private async getDeliveryMetrics(startDate: Date): Promise<DeliveryMetrics> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [current, previous, avgStats] = await Promise.all([
      this.prisma.delivery.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      this.prisma.delivery.aggregate({
        where: { createdAt: { gte: previousStartDate, lt: startDate }, status: 'DELIVERED' },
        _count: true,
        _sum: { deliveryFee: true },
      }),
      this.prisma.delivery.aggregate({
        where: { createdAt: { gte: startDate, lte: endDate }, status: 'DELIVERED' },
        _count: true,
        _sum: { deliveryFee: true },
        _avg: { deliveryFee: true, distanceKm: true },
      }),
    ]);

    const total = current.reduce((s, g) => s + g._count, 0);
    const completed = current.find((g) => g.status === 'DELIVERED')?._count || 0;
    const cancelled = current
      .filter((g) => g.status === 'CANCELLED')
      .reduce((s, g) => s + g._count, 0);

    const revenue = Number(avgStats._sum.deliveryFee || 0);
    const prevRevenue = Number(previous._sum.deliveryFee || 0);
    const prevCount = previous._count;

    return {
      total,
      completed,
      cancelled,
      completionRate: total > 0 ? this.toTwoDecimals((completed / total) * 100) : 0,
      revenue: this.toTwoDecimals(revenue),
      avgFee: this.toTwoDecimals(Number(avgStats._avg.deliveryFee || 0)),
      avgDistanceKm: this.toTwoDecimals(Number(avgStats._avg.distanceKm || 0)),
      revenueChange: this.calculatePercentageChange(revenue, prevRevenue),
      countChange: this.calculatePercentageChange(completed, prevCount),
    };
  }

  private async getPayoutSummary(): Promise<PayoutSummary> {
    const [vendorPending, vendorPaid, riderPending, riderPaid] = await Promise.all([
      this.prisma.vendorPayout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.vendorPayout.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.riderPayout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.riderPayout.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ]);

    const vendorPayoutsPending = this.toTwoDecimals(Number(vendorPending._sum.amount || 0));
    const vendorPayoutsPaid = this.toTwoDecimals(Number(vendorPaid._sum.amount || 0));
    const riderPayoutsPending = this.toTwoDecimals(Number(riderPending._sum.amount || 0));
    const riderPayoutsPaid = this.toTwoDecimals(Number(riderPaid._sum.amount || 0));

    return {
      vendorPayoutsPending,
      vendorPayoutsPaid,
      riderPayoutsPending,
      riderPayoutsPaid,
      totalPendingPayouts: this.toTwoDecimals(vendorPayoutsPending + riderPayoutsPending),
      totalPaidPayouts: this.toTwoDecimals(vendorPayoutsPaid + riderPayoutsPaid),
    };
  }

  private async getUserBreakdown(startDate: Date): Promise<UserBreakdown> {
    const endDate = new Date();
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);

    const [byRole, newThisPeriod, newPreviousPeriod] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role', 'status'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
    ]);

    const totalActive = byRole.reduce((s, g) => s + g._count, 0);
    const counts = (role: string) =>
      byRole.filter((g) => g.role === role).reduce((s, g) => s + g._count, 0);

    return {
      totalActive,
      customers: counts('CUSTOMER'),
      vendors: counts('VENDOR'),
      riders: counts('RIDER'),
      admins: counts('ADMIN') + counts('SUPER_ADMIN') + counts('ADMIN_MANAGER') + counts('ADMIN_SUPPORT') + counts('ADMIN_FINANCE'),
      newThisPeriod,
      newPreviousPeriod,
      growth: this.calculatePercentageChange(newThisPeriod, newPreviousPeriod),
    };
  }

  private async getPaymentMethodBreakdown(startDate: Date): Promise<PaymentMethodBreakdown[]> {
    const endDate = new Date();
    const results = await this.prisma.$queryRaw<
      Array<{ method: string; count: bigint; amount: number }>
    >`
      SELECT method, COUNT(*)::bigint as count, SUM(amount)::numeric as amount
      FROM "Payment"
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
        AND status = 'PAID'
      GROUP BY method
      ORDER BY amount DESC
    `;

    const total = results.reduce((s, r) => s + Number(r.amount), 0);

    return results.map((r) => ({
      method: r.method,
      count: Number(r.count),
      amount: this.toTwoDecimals(Number(r.amount)),
      percentage: total > 0 ? this.toTwoDecimals((Number(r.amount) / total) * 100) : 0,
    }));
  }

  private async getDisputeMetrics(): Promise<DisputeMetrics> {
    const [open, resolved, total, byReason] = await Promise.all([
      this.prisma.dispute.count({ where: { status: 'OPEN' } }),
      this.prisma.dispute.count({ where: { status: 'RESOLVED' } }),
      this.prisma.dispute.count(),
      this.prisma.dispute.groupBy({
        by: ['reason'],
        _count: true,
        orderBy: { _count: { reason: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      open,
      resolved,
      total,
      resolutionRate: total > 0 ? this.toTwoDecimals((resolved / total) * 100) : 0,
      byCategory: byReason.map((r) => ({ reason: r.reason, count: r._count })),
    };
  }

  async exportAnalyticsToCSV(days: number = 30): Promise<string> {
    const data = await this.getAnalyticsReport(days);

    const sections: string[] = [];

    // Overview
    sections.push('=== PLATFORM OVERVIEW ===');
    sections.push('Metric,Value');
    sections.push(`Platform Revenue,${data.overview.platformRevenue}`);
    sections.push(`Order Revenue,${data.overview.totalRevenue}`);
    sections.push(`Ride Revenue,${data.overview.rideRevenue}`);
    sections.push(`Delivery Revenue,${data.overview.deliveryRevenue}`);
    sections.push(`Total Orders,${data.overview.totalOrders}`);
    sections.push(`Total Rides,${data.overview.totalRides}`);
    sections.push(`Total Deliveries,${data.overview.totalDeliveries}`);
    sections.push(`Active Stores,${data.overview.activeStores}`);
    sections.push('');

    // Order volume by date
    sections.push('=== ORDER VOLUME ===');
    sections.push('Date,Orders,Revenue');
    data.orderVolume.forEach((row) => {
      sections.push(`${row.date},${row.orders},${row.revenue}`);
    });
    sections.push('');

    // Revenue breakdown by store type
    sections.push('=== REVENUE BREAKDOWN BY STORE TYPE ===');
    sections.push('Category,Amount,Percentage,Change%');
    data.revenueBreakdown.forEach((r) => {
      sections.push(`${r.category},${r.amount},${r.percentage},${r.change}`);
    });
    sections.push('');

    // Top vendors
    sections.push('=== TOP VENDORS ===');
    sections.push('Name,Revenue,Orders,Rating,Change%');
    data.topVendors.forEach((v) => {
      sections.push(`${v.name},${v.revenue},${v.orders},${v.rating},${v.change}`);
    });
    sections.push('');

    // Rides
    sections.push('=== RIDE METRICS ===');
    sections.push('Metric,Value');
    sections.push(`Total,${data.rides.total}`);
    sections.push(`Completed,${data.rides.completed}`);
    sections.push(`Cancelled,${data.rides.cancelled}`);
    sections.push(`Completion Rate,${data.rides.completionRate}%`);
    sections.push(`Revenue,${data.rides.revenue}`);
    sections.push(`Avg Fare,${data.rides.avgFare}`);
    sections.push(`Avg Duration (min),${data.rides.avgDurationMin}`);
    sections.push(`Avg Distance (km),${data.rides.avgDistanceKm}`);
    sections.push('');

    // Deliveries
    sections.push('=== DELIVERY METRICS ===');
    sections.push('Metric,Value');
    sections.push(`Total,${data.deliveries.total}`);
    sections.push(`Completed,${data.deliveries.completed}`);
    sections.push(`Cancelled,${data.deliveries.cancelled}`);
    sections.push(`Completion Rate,${data.deliveries.completionRate}%`);
    sections.push(`Revenue,${data.deliveries.revenue}`);
    sections.push(`Avg Fee,${data.deliveries.avgFee}`);
    sections.push(`Avg Distance (km),${data.deliveries.avgDistanceKm}`);
    sections.push('');

    // Payouts
    sections.push('=== PAYOUTS ===');
    sections.push('Category,Amount');
    sections.push(`Vendor Pending,${data.payouts.vendorPayoutsPending}`);
    sections.push(`Vendor Paid,${data.payouts.vendorPayoutsPaid}`);
    sections.push(`Rider Pending,${data.payouts.riderPayoutsPending}`);
    sections.push(`Rider Paid,${data.payouts.riderPayoutsPaid}`);
    sections.push('');

    // Users
    sections.push('=== USER BREAKDOWN ===');
    sections.push('Role,Count');
    sections.push(`Total Active,${data.users.totalActive}`);
    sections.push(`Customers,${data.users.customers}`);
    sections.push(`Vendors,${data.users.vendors}`);
    sections.push(`Riders,${data.users.riders}`);
    sections.push(`Admins,${data.users.admins}`);
    sections.push(`New This Period,${data.users.newThisPeriod}`);
    sections.push('');

    // Payment methods
    sections.push('=== PAYMENT METHODS ===');
    sections.push('Method,Count,Amount,Percentage');
    data.paymentMethods.forEach((p) => {
      sections.push(`${p.method},${p.count},${p.amount},${p.percentage}%`);
    });
    sections.push('');

    // Disputes
    sections.push('=== DISPUTES ===');
    sections.push('Metric,Value');
    sections.push(`Open,${data.disputes.open}`);
    sections.push(`Resolved,${data.disputes.resolved}`);
    sections.push(`Total,${data.disputes.total}`);
    sections.push(`Resolution Rate,${data.disputes.resolutionRate}%`);
    sections.push('');
    sections.push('Reason,Count');
    data.disputes.byCategory.forEach((d) => {
      sections.push(`${d.reason},${d.count}`);
    });

    return sections.join('\n');
  }
}
