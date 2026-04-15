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
import { REDIS_KEYS } from '../redis/redis-keys.constants';
import {
  ATOMIC_SET_OFFLINE,
  ATOMIC_SET_RIDER_OFFLINE,
} from '../redis/lua-scripts'; // BUG-4 fix
import { PrismaService } from '../../prisma/prisma.service';
import { FcmService } from '../../libs/fcm/fcm.service';
import { ExpoPushService } from '../../libs/expo/expo-push.service';

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

  private readonly INACTIVITY_THRESHOLD = REDIS_TTL.DRIVER_INACTIVITY; // 4 h
  private readonly GRACE_PERIOD = 30; // 30 seconds grace period after ping

  // BUG-11 fix: removed in-memory inactiveDriversLastCheck Map.
  // Grace-period state is now stored in Redis (key: driver:{id}:inactivityPing)
  // so it survives multi-instance deployments.

  constructor(
    private readonly redis: RedisService,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly expoPushService: ExpoPushService,
  ) {
    super();
  }

  async process(job: Job<CheckInactivityJobData>): Promise<void> {
    const now = Date.now();

    this.logger.debug('🔍 Checking driver inactivity...');

    try {
      // Log every driver currently tracked in Redis
      const allDriverStates = await this.redis.getAllDriverStates();
      if (allDriverStates.length === 0) {
        this.logger.debug('No drivers found in Redis');
      } else {
        this.logger.debug(
          `📋 All drivers in Redis (${allDriverStates.length}):`,
        );
        for (const s of allDriverStates) {
          const age = s.lastSeen
            ? Math.round((Date.now() - s.lastSeen) / 1000)
            : null;
          this.logger.debug(
            `  • ${s.id} | status=${s.status} | lastSeen=${
              age !== null ? `${age}s ago` : 'never'
            } | job=${s.currentJobId ?? 'none'}`,
          );
        }
      }

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

      // Clean up ping keys for drivers that came back online
      // (With Redis-backed keys, TTL handles expiry automatically — no manual cleanup needed here)
    } catch (error) {
      this.logger.error('Error checking driver inactivity:', error);
      throw error;
    }
  }

  private async handleInactiveDriver(
    driverId: string,
    now: number,
  ): Promise<void> {
    // BUG-11 fix: use Redis key instead of in-memory Map so grace period
    // state is shared across multiple backend instances.
    const pingKey = REDIS_KEYS.DRIVER_INACTIVITY_PING(driverId);
    const lastPingTs = await this.redis.getClient().get(pingKey);

    if (!lastPingTs) {
      // First time detecting this driver as inactive
      // Send ping event and give grace period
      this.logger.warn(`🔔 Pinging inactive driver ${driverId}`);

      const state = await this.redis.getDriverState(driverId);

      this.eventBus.emitDriverPingInactive({
        driverId,
        lastSeen: state?.lastSeen || 0,
        timestamp: now,
      });

      // Send push notification so the driver knows we haven't received
      // a location update and their status may change.
      await this.sendInactivityPing(driverId);

      // Store ping timestamp with TTL = grace period
      await this.redis
        .getClient()
        .set(pingKey, now.toString(), 'EX', this.GRACE_PERIOD * 2);
    } else {
      // Driver was inactive in last check too
      const timeSinceLastCheck = (now - parseInt(lastPingTs, 10)) / 1000; // seconds

      if (timeSinceLastCheck >= this.GRACE_PERIOD) {
        // Grace period expired - mark driver as OFFLINE
        this.logger.warn(
          `❌ Marking driver ${driverId} as OFFLINE (no heartbeat)`,
        );

        await this.setDriverOfflineForInactivity(driverId);

        await this.redis.getClient().del(pingKey); // clean up ping key
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
    await this.redis.removeFromDriverActiveSet(driverId); // BUG-6 fix: remove from active set on inactivity eviction

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

    // BUG-4 fix: use imported ATOMIC_SET_RIDER_OFFLINE constant (was global.ATOMIC_SET_RIDER_OFFLINE which is always undefined)
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_RIDER_OFFLINE, 0, riderId);
    if (result !== 1) {
      this.logger.warn(`Failed to mark rider ${riderId} offline in Redis`);
      return;
    }

    await this.redis.removeFromRiderActiveSet(riderId); // BUG-6 fix

    if (this.eventBus.emitRiderMarkedInactive) {
      this.eventBus.emitRiderMarkedInactive({
        riderId,
        lastSeen: state.lastSeen,
        markedAt: Date.now(),
      });
    }

    this.logger.log(`✅ Rider ${riderId} marked INACTIVE due to inactivity`);
  }

  /** Send a push notification to an inactive driver asking them to confirm they are still online. */
  private async sendInactivityPing(driverId: string): Promise<void> {
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: { riderId: driverId },
        select: { token: true, platform: true },
      });

      if (tokens.length === 0) return;

      const title = 'Are you still online?';
      const body =
        "We haven't received a location update from you. Open the app to keep your status active.";
      const data = { type: 'INACTIVITY_PING' };

      for (const t of tokens) {
        const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[');
        if (isExpo) {
          await this.expoPushService.sendToDevice(t.token, title, body, data, 'trip-updates');
        } else {
          await this.fcmService.sendToDevice(t.token, title, body, data);
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to send inactivity ping to driver ${driverId}:`,
        err,
      );
    }
  }
}
