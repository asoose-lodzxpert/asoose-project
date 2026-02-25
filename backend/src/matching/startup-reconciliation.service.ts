import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { REDIS_KEYS } from './redis/redis-keys.constants';

/**
 * StartupReconciliationService
 *
 * Runs once on application bootstrap.
 * On every restart:
 *  1. ALL riders/drivers are marked offline in Prisma.
 *  2. Redis driver/rider status keys are force-set to OFFLINE (BUG-5 fix) so
 *     no ghost-ONLINE entries linger until the inactivity processor fires.
 *  3. The drivers:active and riders:active SETs are cleared so getInactiveDrivers
 *     and getAllDriverStates don't return stale entries.
 *
 * Users must tap "Go Online" to re-enter the matching pool.
 */
@Injectable()
export class StartupReconciliationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Startup reconciliation: clearing all online states…');

    await Promise.all([this.reconcileDatabase(), this.reconcileRedis()]);
  }

  private async reconcileDatabase(): Promise<void> {
    try {
      const result = await this.prisma.rider.updateMany({
        where: { isOnline: true },
        data: { isOnline: false },
      });
      this.logger.log(
        `DB reconciliation: marked ${result.count} rider(s)/driver(s) offline.`,
      );
    } catch (err) {
      this.logger.error('DB reconciliation failed (non-fatal):', err?.message);
    }
  }

  /**
   * BUG-5 fix: Force all driver/rider status keys to OFFLINE in Redis so
   * ghost-ONLINE entries from the previous server session don't receive jobs.
   * Uses SCAN (cursor-based, non-blocking) instead of KEYS.
   */
  private async reconcileRedis(): Promise<void> {
    try {
      const client = this.redis.getClient();

      // Clear the active sets immediately — new entries are added as drivers
      // tap "Go Online" after the restart.
      await client.del(
        REDIS_KEYS.DRIVERS_ACTIVE_SET,
        REDIS_KEYS.RIDERS_ACTIVE_SET,
      );

      let driverCount = 0;
      let riderCount = 0;

      // Scan driver status keys and force to OFFLINE
      driverCount += await this.scanAndSetOffline(client, 'driver:*:status');
      riderCount += await this.scanAndSetOffline(client, 'rider:*:status');

      this.logger.log(
        `Redis reconciliation: forced ${driverCount} driver(s) and ${riderCount} rider(s) to OFFLINE.`,
      );
    } catch (err) {
      this.logger.error(
        'Redis reconciliation failed (non-fatal):',
        err?.message,
      );
    }
  }

  private async scanAndSetOffline(
    client: ReturnType<RedisService['getClient']>,
    pattern: string,
  ): Promise<number> {
    let cursor = '0';
    let count = 0;
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        for (const key of keys) {
          pipeline.set(key, 'OFFLINE');
          count++;
        }
        await pipeline.exec();
      }
    } while (cursor !== '0');
    return count;
  }
}
