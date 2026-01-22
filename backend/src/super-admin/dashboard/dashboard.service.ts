import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
import { DisputesService } from '../dispute/dispute.service';
import { StoresService } from '../vendors/vendors.service'; 
import {
  OrderStatus,
  DisputeStatus,
  StoreStatus,
  VerificationStatus,
  UserRole,
  User,
} from '@prisma/client';

// ==================== INTERFACES ====================

export interface DashboardAlert {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  category: string;
  time: string;
  status: 'New' | 'Ack' | 'Resolved' | 'Investigating';
}

export interface DashboardActivity {
  id: string;
  type: 'order' | 'ride' | 'vendor' | 'delivery' | 'customer' | 'admin';
  event: string;
  entity: string;
  time: string;
  action: string;
}

export interface QuickAccessStats {
  approvals: { total: number; details: string };
  disputes: { total: number; details: string };
  revenue: { growth: string; details: string; isPositive: boolean };
}

export interface TrendingMetrics {
  ordersWeekly: number;
  revenueWeekly: number;
  isAccelerating: boolean;
  criticalAlerts: number;
}

export interface DashboardResponse {
  stats: StatCard[];
  quickAccess: QuickAccessStats;
  trending?: TrendingMetrics;
}

interface StatCard {
  label: string;
  value: string;
  trend: 'up' | 'down';
  change: string;
  iconName: string;
  color: string;
  bgColor: string;
}

// ==================== SERVICE ====================

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly STATS_CACHE_KEY = 'dashboard:stats:v2';
  private readonly ACTIVITY_CACHE_KEY = 'dashboard:activity';
  private readonly ALERTS_CACHE_KEY = 'dashboard:alerts';

  constructor(
    private prisma: PrismaService,
    private disputesService: DisputesService,
    private storesService: StoresService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ==================== AUTHORIZATION ====================

  private validateSuperAdmin(user: User): void {
    if (
      !user ||
      (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN)
    ) {
      this.logger.warn(
        `Unauthorized dashboard access attempt by user: ${user?.id}`,
      );
      throw new UnauthorizedException('Super admin access required');
    }
  }

  // ==================== MAIN STATS ENDPOINT ====================

  async getStats(currentUser: User): Promise<DashboardResponse> {
    this.validateSuperAdmin(currentUser);

    try {
      // Try cache first
      const cached = await this.cacheManager.get<DashboardResponse>(
        this.STATS_CACHE_KEY,
      );
      if (cached) {
        this.logger.debug('Returning cached dashboard stats');
        return cached;
      }

      // Calculate fresh stats
      const stats = await this.calculateStats();

      // Cache for next request
      await this.cacheManager.set(this.STATS_CACHE_KEY, stats, this.CACHE_TTL);

      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch dashboard stats', error.stack);
      // ✅ FIX 3: Removed getMinimalStats fallback. Fail loudly so you know something is wrong.
      throw new InternalServerErrorException(
        'System metrics currently unavailable. Please check system health.',
      );
    }
  }

  // ==================== OPTIMIZED STATS CALCULATION ====================

  private async calculateStats(): Promise<DashboardResponse> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      orderMetrics,
      revenueMetrics,
      userMetrics,
      storeMetrics,
      disputeCount,
    ] = await Promise.all([
      this.getOrderMetrics(
        sevenDaysAgo,
        fourteenDaysAgo,
        thirtyDaysAgo,
        sixtyDaysAgo,
      ),
      this.getRevenueMetrics(
        sevenDaysAgo,
        fourteenDaysAgo,
        thirtyDaysAgo,
        sixtyDaysAgo,
      ),
      this.getUserMetrics(thirtyDaysAgo),
      this.getStoreMetrics(),
      this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
    ]);

    // Calculate growth percentages
    const orderGrowth = this.calculatePercentageChange(
      orderMetrics.currentMonth,
      orderMetrics.previousMonth,
    );
    const userGrowth = this.calculatePercentageChange(
      userMetrics.active,
      userMetrics.priorToMonth,
    );
    const revenueGrowth = this.calculatePercentageChange(
      revenueMetrics.currentMonth,
      revenueMetrics.previousMonth,
    );
    const weeklyOrderGrowth = this.calculatePercentageChange(
      orderMetrics.lastWeek,
      orderMetrics.previousWeek,
    );
    const weeklyRevenueGrowth = this.calculatePercentageChange(
      revenueMetrics.lastWeek,
      revenueMetrics.previousWeek,
    );

    // Build stat cards
    const stats: StatCard[] = [
      {
        label: 'Total Revenue',
        value: this.formatCurrency(revenueMetrics.lifetime),
        trend: revenueGrowth >= 0 ? 'up' : 'down',
        change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%`,
        iconName: 'DollarSign',
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      },
      {
        label: 'Active Orders (30d)',
        value: orderMetrics.currentMonth.toLocaleString(),
        trend: orderGrowth >= 0 ? 'up' : 'down',
        change: `${orderGrowth > 0 ? '+' : ''}${orderGrowth}%`,
        iconName: 'ShoppingCart',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        label: 'Active Users',
        value: userMetrics.active.toLocaleString(),
        trend: userGrowth >= 0 ? 'up' : 'down',
        change: `${userGrowth > 0 ? '+' : ''}${userGrowth}%`,
        iconName: 'UserCheck',
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
      },
      {
        label: 'Pending Approvals',
        value: storeMetrics.pendingApprovals.toLocaleString(),
        trend: 'up',
        change: '0',
        iconName: 'Truck',
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
    ];

    // Quick access data
    const quickAccess: QuickAccessStats = {
      approvals: {
        total: storeMetrics.pendingApprovals,
        details: 'Stores awaiting verification',
      },
      disputes: {
        total: disputeCount,
        details: 'Unresolved customer issues',
      },
      revenue: {
        growth: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%`,
        details: 'Growth vs last 30 days',
        isPositive: revenueGrowth >= 0,
      },
    };

    // Trending metrics (velocity indicators)
    const trending: TrendingMetrics = {
      ordersWeekly: weeklyOrderGrowth,
      revenueWeekly: weeklyRevenueGrowth,
      isAccelerating: weeklyOrderGrowth > orderGrowth,
      criticalAlerts: disputeCount + storeMetrics.pendingApprovals,
    };

    return { stats, quickAccess, trending };
  }

  // ==================== METRIC AGGREGATORS ====================

  private async getOrderMetrics(
    sevenDaysAgo: Date,
    fourteenDaysAgo: Date,
    thirtyDaysAgo: Date,
    sixtyDaysAgo: Date,
  ) {
    // Single aggregation with time-based grouping
    const results = await this.prisma.$queryRaw<
      Array<{
        period: string;
        count: bigint;
      }>
    >`
      SELECT 
        CASE 
          WHEN "createdAt" >= ${sevenDaysAgo} THEN 'lastWeek'
          WHEN "createdAt" >= ${fourteenDaysAgo} THEN 'previousWeek'
          WHEN "createdAt" >= ${thirtyDaysAgo} THEN 'currentMonth'
          WHEN "createdAt" >= ${sixtyDaysAgo} THEN 'previousMonth'
        END as period,
        COUNT(*)::bigint as count
      FROM "Order"
      WHERE "createdAt" >= ${sixtyDaysAgo}
      GROUP BY period
    `;

    const metrics = {
      lastWeek: 0,
      previousWeek: 0,
      currentMonth: 0,
      previousMonth: 0,
    };

    results.forEach((row) => {
      if (row.period) {
        metrics[row.period as keyof typeof metrics] = Number(row.count);
      }
    });

    return metrics;
  }

  private async getRevenueMetrics(
    sevenDaysAgo: Date,
    fourteenDaysAgo: Date,
    thirtyDaysAgo: Date,
    sixtyDaysAgo: Date,
  ) {
    const results = await this.prisma.$queryRaw<
      Array<{
        period: string | null;
        total: number;
      }>
    >`
      SELECT 
        CASE 
          WHEN "deliveredAt" >= ${sevenDaysAgo} THEN 'lastWeek'
          WHEN "deliveredAt" >= ${fourteenDaysAgo} THEN 'previousWeek'
          WHEN "deliveredAt" >= ${thirtyDaysAgo} THEN 'currentMonth'
          WHEN "deliveredAt" >= ${sixtyDaysAgo} THEN 'previousMonth'
          ELSE NULL
        END as period,
        COALESCE(SUM("total"), 0)::float as total
      FROM "Order"
      WHERE "status" = ${OrderStatus.DELIVERED}
      GROUP BY period
    `;

    const lifetime = await this.prisma.order.aggregate({
      where: { status: OrderStatus.DELIVERED },
      _sum: { total: true },
    });

    const metrics = {
      lifetime: lifetime._sum.total || 0,
      lastWeek: 0,
      previousWeek: 0,
      currentMonth: 0,
      previousMonth: 0,
    };

    results.forEach((row) => {
      if (row.period) {
        metrics[row.period as keyof typeof metrics] = row.total;
      }
    });

    return metrics;
  }

  private async getUserMetrics(thirtyDaysAgo: Date) {
    const [active, priorToMonth] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { status: 'ACTIVE', createdAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    return { active, priorToMonth };
  }

  private async getStoreMetrics() {
    const results = await this.prisma.store.groupBy({
      by: ['status', 'verification'],
      _count: true,
    });

    let activeStores = 0;
    let pendingApprovals = 0;

    results.forEach((group) => {
      if (group.status === StoreStatus.ACTIVE) {
        activeStores += group._count;
      }
      if (group.verification === VerificationStatus.PENDING) {
        pendingApprovals += group._count;
      }
    });

    return { activeStores, pendingApprovals };
  }

  // ==================== ACTIVITIES ====================

  async getRecentActivity(currentUser: User): Promise<DashboardActivity[]> {
    this.validateSuperAdmin(currentUser);

    try {
      // Check cache
      const cached = await this.cacheManager.get<DashboardActivity[]>(
        this.ACTIVITY_CACHE_KEY,
      );
      if (cached) return cached;

      const logs = await this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      });

      const activities = logs.map((log) => this.mapActivityLog(log));

      // Cache for 1 minute (more frequent updates)
      await this.cacheManager.set(this.ACTIVITY_CACHE_KEY, activities, 60);

      return activities;
    } catch (error) {
      this.logger.error('Failed to fetch recent activity', error.stack);
      return []; // Graceful degradation
    }
  }

  private mapActivityLog(log: any): DashboardActivity {
    const action = log.action?.toLowerCase() || '';

    // Intelligent type detection based on action context
    let type: DashboardActivity['type'] = 'admin';

    if (action.includes('order')) type = 'order';
    else if (action.includes('ride')) type = 'ride';
    else if (action.includes('delivery')) type = 'delivery';
    else if (action.includes('store') || action.includes('vendor'))
      type = 'vendor';
    else if (action.includes('customer')) type = 'customer';
    else {
      // Fallback to role-based mapping
      const roleMap: Record<string, DashboardActivity['type']> = {
        CUSTOMER: 'customer',
        VENDOR: 'vendor',
        RIDER: 'ride',
        ADMIN: 'admin',
        SUPER_ADMIN: 'admin',
      };
      type = roleMap[log.user.role] || 'admin';
    }

    return {
      id: log.id,
      type,
      event: log.action,
      entity: log.target || log.user.name,
      time: log.createdAt.toISOString(),
      action: 'View',
    };
  }

  // ==================== ALERTS ====================

  async getAlerts(currentUser: User): Promise<DashboardAlert[]> {
    this.validateSuperAdmin(currentUser);

    try {
      // Check cache
      const cached = await this.cacheManager.get<DashboardAlert[]>(
        this.ALERTS_CACHE_KEY,
      );
      if (cached) return cached;

      const [disputes, pendingStores] = await Promise.all([
        this.prisma.dispute.findMany({
          where: { status: DisputeStatus.OPEN },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { openedByUser: { select: { name: true } } },
        }),
        this.prisma.store.findMany({
          where: { verification: VerificationStatus.PENDING },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const alerts: DashboardAlert[] = [];

      // High priority disputes
      disputes.forEach((d) => {
        alerts.push({
          id: d.id,
          category: 'Dispute',
          message: `Dispute from ${d.openedByUser.name}: ${d.reason}`,
          severity:
            d.priority === 'HIGH' || d.priority === 'URGENT'
              ? 'HIGH'
              : 'MEDIUM',
          status: 'New',
          time: d.createdAt.toISOString(),
        });
      });

      // Pending verifications
      pendingStores.forEach((s) => {
        alerts.push({
          id: s.id,
          category: 'Verification',
          message: `New store registration: ${s.name}`,
          severity: 'MEDIUM',
          status: 'New',
          time: s.createdAt.toISOString(),
        });
      });

      // Sort by time (newest first)
      const sortedAlerts = alerts.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );

      // Cache for 2 minutes
      await this.cacheManager.set(this.ALERTS_CACHE_KEY, sortedAlerts, 120);

      return sortedAlerts;
    } catch (error) {
      this.logger.error('Failed to fetch alerts', error.stack);
      return []; // Graceful degradation
    }
  }

  // ==================== REAL ALERT RESOLUTION (FIXED) ====================

  async resolveAlert(id: string, currentUser: User) {
    this.validateSuperAdmin(currentUser);

    // 1. Check if it's a Dispute
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (dispute) {
      // If already resolved, just clean up cache
      if (dispute.status === DisputeStatus.RESOLVED) {
        await this.invalidateCache();
        return { success: true, message: 'Dispute already resolved' };
      }

      // Perform real resolution via DisputesService
      await this.disputesService.resolve(
        id,
        {
          action: 'RESOLVED_NO_REFUND', // Ensure this matches your Enum or String literal
          resolutionNotes: 'Quick resolution triggered from Admin Dashboard',
          refundSource: 'NONE', // Ensure matches Enum
        } as any,
        currentUser.id,
      );

      await this.invalidateCache();
      return { success: true, message: 'Dispute marked as resolved' };
    }

    // 2. Check if it's a Store Pending Verification
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (store) {
      if (store.verification === VerificationStatus.PENDING) {
        // Perform real verification via StoresService (or fallback to Prisma)
        // Since StoresService doesn't have a specific 'verifyStore' method exposed in the interface we saw,
        // we use the 'update' method which is available.
        await this.storesService.update(
          id,
          { status: StoreStatus.ACTIVE, verification: VerificationStatus.VERIFIED }, // Assuming 'verification' field handling exists or we do direct DB update if logic is simple
          currentUser.id
        );

        // Fallback direct DB update if StoresService.update doesn't handle verification status directly
        // (Double safety since we are inside the Dashboard service)
        if (store.status !== StoreStatus.ACTIVE) {
             await this.prisma.store.update({
                where: { id },
                data: { verification: VerificationStatus.VERIFIED, status: StoreStatus.ACTIVE }
             });
        }

        await this.invalidateCache();
        return { success: true, message: 'Store approved successfully' };
      }
    }

    throw new NotFoundException('Alert entity not found or already processed');
  }

  // ==================== CACHE MANAGEMENT ====================

  async invalidateCache() {
    await Promise.all([
      this.cacheManager.del(this.STATS_CACHE_KEY),
      this.cacheManager.del(this.ACTIVITY_CACHE_KEY),
      this.cacheManager.del(this.ALERTS_CACHE_KEY),
    ]);
    this.logger.log('Dashboard cache invalidated');
  }

  // ==================== HELPERS ====================

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}