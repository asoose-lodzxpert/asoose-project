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
import { REDIS_TTL, RiderStatus } from '../redis/redis-keys.constants';
import { ATOMIC_SET_RIDER_OFFLINE } from '../redis/lua-scripts';
import { PrismaService } from '../../prisma/prisma.service';
import { FcmService } from '../../libs/fcm/fcm.service';
import { ExpoPushService } from '../../libs/expo/expo-push.service';

/**
 * Rider Inactivity Monitor Worker
 *
 * Runs every 30 seconds to detect riders (RIDER role / delivery workers)
 * who have gone online but stopped sending location heartbeats.
 *
 * Flow:
 * 1. Scan rider:*:status keys for ONLINE riders whose lastSeen > 2 minutes ago
 * 2. First detection → emit ping (grace period of 30 s)
 * 3. Still no heartbeat after grace period → atomically set OFFLINE
 * 4. Skip riders who have an active delivery (currentDelivery key set)
 */
@Processor(QUEUE_NAMES.RIDER_INACTIVITY, {
  concurrency: 1,
})
export class RiderInactivityProcessor extends WorkerHost {
  private readonly logger = new Logger(RiderInactivityProcessor.name);

  private readonly INACTIVITY_THRESHOLD = REDIS_TTL.RIDER_INACTIVITY; // 4 h
  private readonly GRACE_PERIOD = 30; // 30 s

  /** Tracks first detection time so we can enforce the grace period */
  private readonly inactiveRidersLastCheck = new Map<string, number>();

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

    this.logger.debug('🔍 Checking rider inactivity...');

    try {
      // Log every rider currently tracked in Redis
      const allRiderStates = await this.redis.getAllRiderStates();
      if (allRiderStates.length === 0) {
        this.logger.debug('No riders found in Redis');
      } else {
        this.logger.debug(`📋 All riders in Redis (${allRiderStates.length}):`);
        for (const s of allRiderStates) {
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

      const inactiveRiderIds = await this.redis.getInactiveRiders(
        this.INACTIVITY_THRESHOLD,
      );

      if (inactiveRiderIds.length === 0) {
        this.logger.debug('No inactive riders found');
        return;
      }

      this.logger.warn(`Found ${inactiveRiderIds.length} inactive rider(s)`);

      for (const riderId of inactiveRiderIds) {
        await this.handleInactiveRider(riderId, now);
      }

      // Clean up riders who came back online between checks
      for (const riderId of this.inactiveRidersLastCheck.keys()) {
        if (!inactiveRiderIds.includes(riderId)) {
          this.inactiveRidersLastCheck.delete(riderId);
        }
      }
    } catch (error) {
      this.logger.error('Error checking rider inactivity:', error);
      throw error;
    }
  }

  private async handleInactiveRider(
    riderId: string,
    now: number,
  ): Promise<void> {
    const lastCheckTime = this.inactiveRidersLastCheck.get(riderId);

    if (!lastCheckTime) {
      // First detection — emit a ping event and start the grace period
      this.logger.warn(`🔔 Pinging inactive rider ${riderId}`);

      const state = await this.redis.getRiderState(riderId);

      this.eventBus.emitRiderPingInactive({
        riderId,
        lastSeen: state?.lastSeen ?? 0,
        timestamp: now,
      });

      // Send push notification so the rider knows we haven't received
      // a location update and their status may change.
      await this.sendInactivityPing(riderId);

      this.inactiveRidersLastCheck.set(riderId, now);
    } else {
      // Second+ detection — check if the grace period has elapsed
      const timeSinceLastCheck = (now - lastCheckTime) / 1000; // seconds

      if (timeSinceLastCheck >= this.GRACE_PERIOD) {
        this.logger.warn(
          `❌ Marking rider ${riderId} as OFFLINE (no heartbeat for ${Math.round(timeSinceLastCheck)}s)`,
        );

        await this.setRiderOfflineForInactivity(riderId);
        this.inactiveRidersLastCheck.delete(riderId);
      }
    }
  }

  private async setRiderOfflineForInactivity(riderId: string): Promise<void> {
    const state = await this.redis.getRiderState(riderId);

    if (!state) return;

    // Don't forcibly disconnect a rider who is mid-delivery
    if (state.currentJobId) {
      this.logger.warn(
        `Rider ${riderId} has an active delivery — skipping offline transition`,
      );
      return;
    }

    // Atomically set OFFLINE and clear pending assignment
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_RIDER_OFFLINE, 0, riderId);

    if (result !== 1) {
      this.logger.warn(
        `Atomic offline script returned ${result} for rider ${riderId} (already offline or has active job)`,
      );
      return;
    }

    // Remove from geospatial index so they stop appearing in searches
    await this.redis.removeRiderFromGeoIndex(riderId);

    this.eventBus.emitRiderMarkedInactive({
      riderId,
      lastSeen: state.lastSeen,
      markedAt: Date.now(),
    });

    this.logger.log(`✅ Rider ${riderId} marked OFFLINE due to inactivity`);
  }

  /** Send a push notification to an inactive rider asking them to confirm they are still online. */
  private async sendInactivityPing(riderId: string): Promise<void> {
    try {
      const rider = await this.prisma.rider.findUnique({
        where: { id: riderId },
        select: { expoPushToken: true, fcmToken: true },
      });
      if (!rider) return;

      const title = 'Are you still online?';
      const body =
        "We haven't received a location update from you. Open the app to keep your status active.";
      const data = { type: 'INACTIVITY_PING' };

      if (rider.expoPushToken) {
        await this.expoPushService.sendToDevice(
          rider.expoPushToken,
          title,
          body,
          data,
        );
      }
      if (rider.fcmToken) {
        await this.fcmService.sendToDevice(rider.fcmToken, title, body, data);
      }
    } catch (err) {
      this.logger.error(
        `Failed to send inactivity ping to rider ${riderId}:`,
        err,
      );
    }
  }
}
