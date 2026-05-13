import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RedisClientType } from 'redis';
import { ActivityLogService } from 'src/common/services/activity-log.services';
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly MAINTENANCE_CACHE_KEY = 'system:maintenance_mode';

  constructor(
    private prisma: PrismaService,
    // ✅ Inject the ActivityLogService
    private logService: ActivityLogService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  /**
   * Fetches all system settings from the database.
   */
  async findAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { category: 'asc' },
    });
  }

  /**
   * Updates or Creates multiple settings in a single transaction.
   * ✅ Added adminId parameter to track who performed the update
   */
  async updateBulk(settings: { key: string; value: any }[], adminId: string) {
    try {
      const operations = settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: String(s.value) },
          create: {
            key: s.key,
            value: String(s.value),
            category: this.inferCategory(s.key),
          },
        }),
      );

      const results = await this.prisma.$transaction(operations);

      // 1. Audit Log
      await this.logService.record({
        userId: adminId,
        action: 'SETTINGS_UPDATE',
        target: 'System Settings',
        details: `Updated ${settings.length} system configuration(s)`,
        metadata: {
          updatedKeys: settings.map((s) => s.key),
        },
      });

      if (settings.some((s) => s.key === 'maintenance_mode')) {
        await this.redisClient.del(this.MAINTENANCE_CACHE_KEY);
        this.logger.log('Maintenance mode changed: Redis cache invalidated.');
      }

      return results;
    } catch (error) {
      this.logger.error('Failed to update bulk settings', error.stack);
      throw new BadRequestException('Failed to synchronize system settings');
    }
  }

  /**
   * Helper to assign categories to new settings if they don't exist yet.
   */
  private inferCategory(key: string): string {
    if (
      key.includes('fare') ||
      key.includes('cost') ||
      key.includes('radius') ||
      key.includes('per_km') ||
      key.includes('base_fare') ||
      key.includes('ride_') ||
      key.includes('delivery_')
    )
      return 'Logistics';
    if (key.includes('commission') || key.includes('withdrawal'))
      return 'Financials';
    return 'General';
  }

  /**
   * Seeds default values into a fresh database.
   */
  async seedDefaults() {
    const defaults = [
      { key: 'maintenance_mode', value: 'false', category: 'General' },
      { key: 'support_phone', value: '+234 800 000 0000', category: 'General' },
      // Financials
      { key: 'global_commission', value: '10', category: 'Financials' },
      { key: 'min_withdrawal', value: '5000', category: 'Financials' },
      // Logistics – Ride pricing (Tiered Model)
      { key: 'ride_fare_5km', value: '5000', category: 'Logistics' },
      { key: 'ride_fare_10km', value: '8000', category: 'Logistics' },
      { key: 'ride_fare_15km', value: '12000', category: 'Logistics' },
      { key: 'ride_fare_20km', value: '15000', category: 'Logistics' },
      { key: 'ride_fare_25km', value: '18000', category: 'Logistics' },
      { key: 'ride_fare_30km', value: '21000', category: 'Logistics' },
      { key: 'ride_fare_extra_km', value: '1000', category: 'Logistics' },
      // Logistics – Airport pricing
      { key: 'ride_airport_base_10km', value: '10000', category: 'Logistics' },
      { key: 'ride_airport_extra_km', value: '2000', category: 'Logistics' },
      // Logistics – Surcharges & Fees
      { key: 'ride_night_surcharge_per_km', value: '1000', category: 'Logistics' },
      { key: 'ride_business_multiplier', value: '1.5', category: 'Logistics' },
      { key: 'ride_platform_fee_percent', value: '16', category: 'Logistics' },
      // Logistics – Delivery pricing
      { key: 'delivery_base_fare', value: '700', category: 'Logistics' },
      { key: 'delivery_per_km', value: '400', category: 'Logistics' },
      // Logistics – Operations
      { key: 'search_radius', value: '10', category: 'Logistics' },
    ];

    for (const d of defaults) {
      await this.prisma.systemSetting.upsert({
        where: { key: d.key },
        update: {},
        create: d,
      });
    }
  }
}
