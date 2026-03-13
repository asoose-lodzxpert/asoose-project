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
  OrderStatus, // kept for future use
  DisputeStatus,
  StoreStatus,
  VerificationStatus,
  UserRole,
  User,
} from '@prisma/client';
import { z } from 'zod';
import { subDays } from 'date-fns';

// ==================== VALIDATION SCHEMAS ====================

const StatCardSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(['up', 'down']),
  change: z.string(),
  iconName: z.string(),
  color: z.string(),
  bgColor: z.string(),
});

const DashboardResponseSchema = z.object({
  stats: z.array(StatCardSchema),
  quickAccess: z.object({
    approvals: z.object({ total: z.number(), details: z.string() }),
    disputes: z.object({ total: z.number(), details: z.string() }),
    revenue: z.object({
      growth: z.string(),
      details: z.string(),
      isPositive: z.boolean(),
    }),
  }),
  trending: z
    .object({
      ordersWeekly: z.number(),
      revenueWeekly: z.number(),
      isAccelerating: z.boolean(),
      criticalAlerts: z.number(),
    })
    .optional(),
});

// ==================== INTERFACES ====================

export interface DashboardAlert {
  id: string;
  entityId: string;
  entityType: 'disputes' | 'verification';
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
  entityId: string;
  entityType:
    | 'orders'
    | 'rides'
    | 'deliveries'
    | 'users/vendors'
    | 'users/customers'
    | 'admin';
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

interface ActivityLogWithUser {
  id: string;
  action: string;
  target: string | null;
  metadata: any;
  createdAt: Date;
  user: { name: string; role: UserRole };
}

// ==================== CONSTANTS ====================

const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
const ACTIVITY_CACHE_TTL_SECONDS = 60; // 1 minute
const ALERTS_CACHE_TTL_SECONDS = 2 * 60; // 2 minutes
const MAX_RECENT_ACTIVITIES = 10;
const MAX_ALERTS_DISPLAYED = 5;
const QUERY_TIMEOUT_MS = 5000; // 5 seconds

// ==================== SERVICE ====================

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly STATS_CACHE_KEY = 'dashboard:stats:v3';
  private readonly ACTIVITY_CACHE_KEY = 'dashboard:activity:v2';
  private readonly ALERTS_CACHE_KEY = 'dashboard:alerts:v2';

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
        `Unauthorized dashboard access attempt: ${user?.id || 'unknown'}`,
      );
      throw new UnauthorizedException('Super admin access required');
    }
  }

  // ==================== TIMEOUT WRAPPER ====================

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number = QUERY_TIMEOUT_MS,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout exceeded')), ms),
    );
    return Promise.race([promise, timeout]);
  }

  // ==================== MAIN STATS ENDPOINT ====================

  async getStats(currentUser: User): Promise<DashboardResponse> {
    this.validateSuperAdmin(currentUser);

    try {
      const cached = await this.cacheManager.get<DashboardResponse>(
        this.STATS_CACHE_KEY,
      );
      if (cached) {
        try {
          const validated = DashboardResponseSchema.parse(cached);
          this.logger.debug('Returning validated cached dashboard stats');
          return validated;
        } catch (validationError) {
          this.logger.warn(
            'Cached data validation failed, clearing cache',
            validationError,
          );
          await this.cacheManager.del(this.STATS_CACHE_KEY);
        }
      }

      const stats = await this.withTimeout(this.calculateStats());
      await this.cacheManager.set(
        this.STATS_CACHE_KEY,
        stats,
        CACHE_TTL_SECONDS * 1000,
      );

      return stats;
    } catch (error) {
      this.logger.error('Failed to fetch dashboard stats', error.stack);
      throw new InternalServerErrorException(
        'System metrics currently unavailable. Please check system health.',
      );
    }
  }

  // ==================== OPTIMIZED STATS CALCULATION ====================

  private async calculateStats(): Promise<DashboardResponse> {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const fourteenDaysAgo = subDays(now, 14);
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const [
      orderMetrics,
      revenueMetrics,
      userMetrics,
      storeMetrics,
      disputeCount,
    ] = await Promise.all([
      this.withTimeout(
        this.getOrderMetrics(
          sevenDaysAgo,
          fourteenDaysAgo,
          thirtyDaysAgo,
          sixtyDaysAgo,
        ),
      ),
      this.withTimeout(
        this.getRevenueMetrics(
          sevenDaysAgo,
          fourteenDaysAgo,
          thirtyDaysAgo,
          sixtyDaysAgo,
        ),
      ),
      this.withTimeout(this.getUserMetrics(thirtyDaysAgo)),
      this.withTimeout(this.getStoreMetrics()),
      this.withTimeout(
        this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      ),
    ]);

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

    const stats: StatCard[] = [
      {
        label: 'Total Revenue',
        value: this.formatCurrency(revenueMetrics.lifetime),
        trend: revenueGrowth >= 0 ? 'up' : 'down',
        change: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%`,
        iconName: 'Banknote',
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
    const [lastWeek, previousWeek, currentMonth, previousMonth] =
      await Promise.all([
        this.prisma.order.count({
          where: { createdAt: { gte: sevenDaysAgo }, paymentStatus: 'PAID' },
        }),
        this.prisma.order.count({
          where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }, paymentStatus: 'PAID' },
        }),
        // FIX: was using thirtyDaysAgo→fourteenDaysAgo window (14-30 days ago).
        // Now correctly counts the last 30 days. Also filter to paid-only.
        this.prisma.order.count({
          where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: 'PAID' },
        }),
        this.prisma.order.count({
          where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, paymentStatus: 'PAID' },
        }),
      ]);

    return { lastWeek, previousWeek, currentMonth, previousMonth };
  }

  private async getRevenueMetrics(
    sevenDaysAgo: Date,
    fourteenDaysAgo: Date,
    thirtyDaysAgo: Date,
    sixtyDaysAgo: Date,
  ) {
    const [lifetime, lastWeek, previousWeek, currentMonth, previousMonth] =
      await Promise.all([
        // FIX: use paymentStatus:'PAID' consistently (previously used OrderStatus.DELIVERED
        // which disagrees with the analytics service and excludes paid-but-not-delivered orders).
        this.prisma.order.aggregate({
          where: { paymentStatus: 'PAID' },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: {
            paymentStatus: 'PAID',
            createdAt: { gte: sevenDaysAgo },
          },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: {
            paymentStatus: 'PAID',
            createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
          },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: {
            paymentStatus: 'PAID',
            createdAt: { gte: thirtyDaysAgo },
          },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: {
            paymentStatus: 'PAID',
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
          _sum: { total: true },
        }),
      ]);

    return {
      lifetime: lifetime._sum.total || 0,
      lastWeek: lastWeek._sum.total || 0,
      previousWeek: previousWeek._sum.total || 0,
      currentMonth: currentMonth._sum.total || 0,
      previousMonth: previousMonth._sum.total || 0,
    };
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
      if (group.status === StoreStatus.ACTIVE) activeStores += group._count;
      if (group.verification === VerificationStatus.PENDING)
        pendingApprovals += group._count;
    });
    return { activeStores, pendingApprovals };
  }

  // ==================== ACTIVITIES ====================

  async getRecentActivity(currentUser: User): Promise<DashboardActivity[]> {
    this.validateSuperAdmin(currentUser);

    try {
      const cached = await this.cacheManager.get<DashboardActivity[]>(
        this.ACTIVITY_CACHE_KEY,
      );
      if (cached) return cached;

      const logs = await this.withTimeout(
        this.prisma.activityLog.findMany({
          take: MAX_RECENT_ACTIVITIES,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true, role: true } } },
        }),
      );

      const activities = logs.map((log) => this.mapActivityLog(log));
      await this.cacheManager.set(
        this.ACTIVITY_CACHE_KEY,
        activities,
        ACTIVITY_CACHE_TTL_SECONDS * 1000,
      );

      return activities;
    } catch (error) {
      this.logger.error('Failed to fetch recent activity', error.stack);
      return [];
    }
  }

  private mapActivityLog(log: ActivityLogWithUser): DashboardActivity {
    const action = log.action?.toLowerCase() || '';
    let type: DashboardActivity['type'] = 'admin';
    let entityType: DashboardActivity['entityType'] = 'admin';

    if (action.includes('order')) {
      type = 'order';
      entityType = 'orders';
    } else if (action.includes('ride')) {
      type = 'ride';
      entityType = 'rides';
    } else if (action.includes('delivery')) {
      type = 'delivery';
      entityType = 'deliveries';
    } else if (action.includes('store') || action.includes('vendor')) {
      type = 'vendor';
      entityType = 'users/vendors';
    } else if (action.includes('customer')) {
      type = 'customer';
      entityType = 'users/customers';
    } else {
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
      entityId: log.metadata?.entityId || '',
      entityType,
      time: log.createdAt.toISOString(),
      action: '',
    };
  }

  // ==================== ALERTS ====================

  async getAlerts(currentUser: User): Promise<DashboardAlert[]> {
    this.validateSuperAdmin(currentUser);

    try {
      const cached = await this.cacheManager.get<DashboardAlert[]>(
        this.ALERTS_CACHE_KEY,
      );
      if (cached) return cached;

      const [disputes, pendingStores] = await Promise.all([
        this.withTimeout(
          this.prisma.dispute.findMany({
            where: { status: DisputeStatus.OPEN },
            take: MAX_ALERTS_DISPLAYED,
            orderBy: { createdAt: 'desc' },
            include: { openedByUser: { select: { name: true } } },
          }),
        ),
        this.withTimeout(
          this.prisma.store.findMany({
            where: { verification: VerificationStatus.PENDING },
            take: MAX_ALERTS_DISPLAYED,
            orderBy: { createdAt: 'desc' },
          }),
        ),
      ]);

      const alerts: DashboardAlert[] = [];

      disputes.forEach((d) => {
        alerts.push({
          id: d.id,
          entityId: d.id,
          entityType: 'disputes',
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

      pendingStores.forEach((s) => {
        alerts.push({
          id: s.id,
          entityId: s.id,
          entityType: 'verification',
          category: 'Verification',
          message: `New store registration: ${s.name}`,
          severity: 'MEDIUM',
          status: 'New',
          time: s.createdAt.toISOString(),
        });
      });

      const sortedAlerts = alerts.sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
      );
      await this.cacheManager.set(
        this.ALERTS_CACHE_KEY,
        sortedAlerts,
        ALERTS_CACHE_TTL_SECONDS * 1000,
      );

      return sortedAlerts;
    } catch (error) {
      this.logger.error('Failed to fetch alerts', error.stack);
      return [];
    }
  }

  // ==================== ALERT RESOLUTION (ATOMIC & IDEMPOTENT) ====================

  async resolveAlert(id: string, currentUser: User) {
    this.validateSuperAdmin(currentUser);

    try {
      // Try dispute first (atomic update)
      const dispute = await this.prisma.dispute.updateMany({
        where: {
          id,
          status: { not: DisputeStatus.RESOLVED },
        },
        data: { status: DisputeStatus.RESOLVED },
      });

      if (dispute.count > 0) {
        await this.invalidateCache([
          this.STATS_CACHE_KEY,
          this.ALERTS_CACHE_KEY,
        ]);
        return { success: true, message: 'Dispute marked as resolved' };
      }

      // Check if already resolved
      const existingDispute = await this.prisma.dispute.findUnique({
        where: { id },
      });
      if (existingDispute) {
        return { success: true, message: 'Dispute already resolved' };
      }

      // Try store approval (atomic update)
      const store = await this.prisma.store.updateMany({
        where: {
          id,
          verification: VerificationStatus.PENDING,
        },
        data: {
          verification: VerificationStatus.VERIFIED,
          status: StoreStatus.ACTIVE,
        },
      });

      if (store.count > 0) {
        await this.invalidateCache([
          this.STATS_CACHE_KEY,
          this.ALERTS_CACHE_KEY,
        ]);
        return { success: true, message: 'Store approved successfully' };
      }

      // Check if already approved
      const existingStore = await this.prisma.store.findUnique({
        where: { id },
      });
      if (existingStore) {
        return { success: true, message: 'Store already approved' };
      }

      throw new NotFoundException('Alert entity not found');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error('Failed to resolve alert', error.stack);
      throw new InternalServerErrorException('Failed to resolve alert');
    }
  }

  // ==================== CACHE MANAGEMENT (SELECTIVE) ====================

  async invalidateCache(keys?: string[]) {
    const keysToInvalidate = keys || [
      this.STATS_CACHE_KEY,
      this.ACTIVITY_CACHE_KEY,
      this.ALERTS_CACHE_KEY,
    ];

    await Promise.all(
      keysToInvalidate.map((key) => this.cacheManager.del(key)),
    );
    this.logger.log(
      `Dashboard cache invalidated: ${keysToInvalidate.join(', ')}`,
    );
  }

  // ==================== HELPERS ====================

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
