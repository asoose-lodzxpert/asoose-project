import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  CheckInactivityJobData,
} from '../queue/queue.constants';
import { RedisService } from '../redis/redis.service';
import { EventBusService } from '../events/event-bus.service';
import { REDIS_TTL, DriverStatus } from '../redis/redis-keys.constants';
import { ATOMIC_SET_OFFLINE } from '../redis/lua-scripts';

/**
 * Driver Inactivity Monitor Worker
 *
 * Runs every 30 seconds to detect drivers who haven't sent location updates.
 *
 * Flow:
 * 1. Find drivers with lastSeen > 2 minutes ago
 * 2. Emit ping event (grace period)
 * 3. If still no update after 30s, mark as OFFLINE
 * 4. Remove from hex index and clear state
 */
@Processor(QUEUE_NAMES.DRIVER_INACTIVITY, {
  concurrency: 1, // Only one worker to prevent duplicate processing
})
export class DriverInactivityProcessor extends WorkerHost {
  private readonly logger = new Logger(DriverInactivityProcessor.name);

  private readonly INACTIVITY_THRESHOLD = REDIS_TTL.DRIVER_INACTIVITY; // 120 seconds
  private readonly GRACE_PERIOD = 30; // 30 seconds grace period after ping

  private inactiveDriversLastCheck = new Map<string, number>();

  constructor(
    private readonly redis: RedisService,
    private readonly eventBus: EventBusService,
  ) {
    super();
  }

  async process(job: Job<CheckInactivityJobData>): Promise<void> {
    const now = Date.now();

    this.logger.debug('🔍 Checking driver inactivity...');

    try {
      // Get all inactive drivers
      const inactiveDriverIds = await this.redis.getInactiveDrivers(
        this.INACTIVITY_THRESHOLD,
      );

      if (inactiveDriverIds.length === 0) {
        this.logger.debug('No inactive drivers found');
        return;
      }

      this.logger.warn(`Found ${inactiveDriverIds.length} inactive drivers`);

      for (const driverId of inactiveDriverIds) {
        await this.handleInactiveDriver(driverId, now);
      }

      // Clean up drivers who came back online
      for (const [
        driverId,
        timestamp,
      ] of this.inactiveDriversLastCheck.entries()) {
        if (!inactiveDriverIds.includes(driverId)) {
          this.inactiveDriversLastCheck.delete(driverId);
        }
      }
    } catch (error) {
      this.logger.error('Error checking driver inactivity:', error);
      throw error;
    }
  }

  private async handleInactiveDriver(
    driverId: string,
    now: number,
  ): Promise<void> {
    const lastCheckTime = this.inactiveDriversLastCheck.get(driverId);

    if (!lastCheckTime) {
      // First time detecting this driver as inactive
      // Send ping event and give grace period
      this.logger.warn(`🔔 Pinging inactive driver ${driverId}`);

      const state = await this.redis.getDriverState(driverId);

      this.eventBus.emitDriverPingInactive({
        driverId,
        lastSeen: state?.lastSeen || 0,
        timestamp: now,
      });

      this.inactiveDriversLastCheck.set(driverId, now);
    } else {
      // Driver was inactive in last check too
      const timeSinceLastCheck = (now - lastCheckTime) / 1000; // seconds

      if (timeSinceLastCheck >= this.GRACE_PERIOD) {
        // Grace period expired - mark driver as OFFLINE
        this.logger.warn(
          `❌ Marking driver ${driverId} as OFFLINE (no heartbeat)`,
        );

        await this.setDriverOfflineForInactivity(driverId);

        this.inactiveDriversLastCheck.delete(driverId);
      }
    }
  }

  private async setDriverOfflineForInactivity(driverId: string): Promise<void> {
    await this.handleDriverInactivity(driverId);
  }

  // Handles driver inactivity (same pattern as handleAssignmentTimeout)
  async handleDriverInactivity(driverId: string): Promise<void> {
    const state = await this.redis.getDriverState(driverId);
    if (!state?.hexId) return;

    // Check if driver has active trip
    if (state.currentJobId) {
      this.logger.warn(
        `Driver ${driverId} has active trip, cannot set offline`,
      );
      // Emit alert for support team
      if (this.eventBus.emitSupportAlert) {
        this.eventBus.emitSupportAlert({
          type: 'driver-inactivity-active-trip',
          driverId,
          currentJobId: state.currentJobId,
          timestamp: Date.now(),
        });
      }
      return;
    }

    // Execute atomic offline script
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_OFFLINE, 0, driverId);

    if (result !== 1) return;

    await this.redis.removeDriverFromGeoIndex(driverId);

    if (this.eventBus.emitDriverMarkedInactive) {
      this.eventBus.emitDriverMarkedInactive({
        driverId,
        lastSeen: state.lastSeen,
        markedAt: Date.now(),
      });
    }

    this.logger.log(`✅ Driver ${driverId} marked OFFLINE due to inactivity`);
  }

  // Handles rider inactivity (requires similar Redis and event bus support)
  async handleRiderInactivity(riderId: string): Promise<void> {
    if (!this.redis.getRiderState) {
      this.logger.warn('getRiderState not implemented in RedisService');
      return;
    }
    const state = await this.redis.getRiderState(riderId);
    if (!state) return;

    // Execute atomic offline script for rider
    if (!global.ATOMIC_SET_RIDER_OFFLINE) {
      this.logger.warn('ATOMIC_SET_RIDER_OFFLINE script not implemented');
    } else {
      const result = await this.redis
        .getClient()
        .eval(global.ATOMIC_SET_RIDER_OFFLINE, 0, riderId);
      if (result !== 1) {
        this.logger.warn(`Failed to mark rider ${riderId} offline in Redis`);
        return;
      }
    }

    if (this.eventBus.emitRiderMarkedInactive) {
      this.eventBus.emitRiderMarkedInactive({
        riderId,
        lastSeen: state.lastSeen,
        markedAt: Date.now(),
      });
    }

    this.logger.log(`✅ Rider ${riderId} marked INACTIVE due to inactivity`);
  }
}
