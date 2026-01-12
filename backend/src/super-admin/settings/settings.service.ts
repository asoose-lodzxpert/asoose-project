import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RedisClientType } from 'redis';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly MAINTENANCE_CACHE_KEY = 'system:maintenance_mode';

  constructor(
    private prisma: PrismaService,
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
   * This fixes the "Record to update not found" error by using upsert.
   */
  async updateBulk(settings: { key: string; value: any }[]) {
    try {
      // 1. Create a list of upsert operations 
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

      // 2. Execute all updates atomically
      const results = await this.prisma.$transaction(operations);

      // 3. CACHE INVALIDATION: 
      // If maintenance_mode was changed, we MUST clear Redis so the 
      // AppController and Middleware see the update immediately.
      if (settings.some(s => s.key === 'maintenance_mode')) {
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
    if (key.includes('fare') || key.includes('cost') || key.includes('radius')) return 'Logistics';
    if (key.includes('commission') || key.includes('withdrawal')) return 'Financials';
    return 'General';
  }

  /**
   * Seeds default values into a fresh database.
   */
  async seedDefaults() {
    const defaults = [
      { key: 'maintenance_mode', value: 'false', category: 'General' },
      { key: 'global_commission', value: '10', category: 'Financials' },
      { key: 'support_phone', value: '+234 800 000 0000', category: 'General' },
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