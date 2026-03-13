import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from './redis/redis.service';
import { REDIS_KEYS } from './redis/redis-keys.constants';
import { DriverStateService } from './driver-state/driver-state.service';
import { RiderStateService } from './rider-state/rider-state.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * End-of-Day Scheduler
 *
 * Automatically sets all online drivers and riders to OFFLINE at 21:00 (server time).
 * This is the daily work-close boundary. Drivers/riders must tap "Go Online" the
 * next day to re-enter the matching pool.
 *
 * Riders/drivers with an active job at 21:00 are skipped — they will complete
 * their current delivery/ride first.
 */
@Injectable()
export class EndOfDaySchedulerService {
  private readonly logger = new Logger(EndOfDaySchedulerService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly driverStateService: DriverStateService,
    private readonly riderStateService: RiderStateService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 21 * * *')
  async handleEndOfDay(): Promise<void> {
    this.logger.log('⏰ End-of-day auto-offline triggered (21:00)');

    const client = this.redis.getClient();

    const [driverIds, riderIds] = await Promise.all([
      client.smembers(REDIS_KEYS.DRIVERS_ACTIVE_SET),
      client.smembers(REDIS_KEYS.RIDERS_ACTIVE_SET),
    ]);

    this.logger.log(
      `Found ${driverIds.length} active driver(s) and ${riderIds.length} active rider(s)`,
    );

    // Set drivers offline — skip any with an active job
    const driverResults = await Promise.allSettled(
      driverIds.map(async (driverId) => {
        const state = await this.redis.getDriverState(driverId);
        if (state?.currentJobId) {
          this.logger.warn(
            `Driver ${driverId} has active job (${state.currentJobId}) — skipping EOD offline`,
          );
          return;
        }
        await this.driverStateService.setOffline(driverId, 'end_of_day');
      }),
    );

    // Set riders offline — skip any with an active delivery
    const riderResults = await Promise.allSettled(
      riderIds.map(async (riderId) => {
        const state = await this.redis.getRiderState(riderId);
        if (state?.currentJobId) {
          this.logger.warn(
            `Rider ${riderId} has active delivery (${state.currentJobId}) — skipping EOD offline`,
          );
          return;
        }
        await this.riderStateService.setOffline(riderId, 'end_of_day');
      }),
    );

    const driverErrors = driverResults.filter((r) => r.status === 'rejected');
    const riderErrors = riderResults.filter((r) => r.status === 'rejected');
    if (driverErrors.length || riderErrors.length) {
      this.logger.error(
        `EOD offline errors: ${driverErrors.length} driver(s), ${riderErrors.length} rider(s)`,
      );
    }

    // Sync Prisma isOnline flag so DB stats remain accurate
    try {
      const result = await this.prisma.rider.updateMany({
        where: { isOnline: true },
        data: { isOnline: false },
      });
      this.logger.log(
        `Prisma sync: ${result.count} rider/driver record(s) set isOnline=false`,
      );
    } catch (err) {
      this.logger.error('Prisma EOD sync failed (non-fatal):', err?.message);
    }

    this.logger.log('✅ End-of-day auto-offline complete');
  }
}
