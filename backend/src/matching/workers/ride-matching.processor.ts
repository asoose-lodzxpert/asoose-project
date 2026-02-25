import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  MatchRideJobData,
} from '../queue/queue.constants';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ATOMIC_LOCK_DRIVER } from '../redis/lua-scripts';
import {
  REDIS_TTL,
  JobType,
  DriverStatus,
} from '../redis/redis-keys.constants';

/**
 * Ride Matching Worker
 *
 * CRITICAL: This runs the matching algorithm for ride requests.
 *
 * Algorithm:
 * 1. Get pickup hex
 * 2. Expand in rings (0, 1, 2, 3, 4, 5)
 * 3. For each hex in ring:
 *    - Get available drivers
 *    - Filter out declined drivers
 *    - Sort by distance
 *    - Attempt atomic lock on closest driver
 *    - If locked, notify driver and schedule timeout
 *    - If not locked or declined, try next driver
 * 4. If no driver found after all rings, mark ride as NO_DRIVER_FOUND
 */
@Processor(QUEUE_NAMES.RIDE_MATCHING, {
  concurrency: 10,
  limiter: {
    max: 50,
    duration: 1000,
  },
})
export class RideMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(RideMatchingProcessor.name);

  private readonly MAX_RINGS = 5;
  private readonly MAX_ATTEMPTS = 20; // Max total driver attempts
  private readonly TIMEOUT_MS = 90000; // 90 seconds
  private readonly MAX_MATCHING_RETRIES = 3; // Max full re-queued attempts before cancel
  private readonly RETRY_DELAY_MS = 10_000; // 10s between retries

  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<MatchRideJobData>): Promise<void> {
    const { job: jobSummary, attempt, excludeDriverIds = [] } = job.data;
    const rideId = jobSummary.id;
    this.logger.log(`Matching ride ${rideId} (attempt ${attempt})`);

    try {
      // Verify ride is still in REQUESTED status
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        select: { status: true, riderId: true, customerId: true },
      });

      if (!ride) {
        this.logger.error(`Ride ${rideId} not found`);
        return;
      }

      // Allow matching when the ride is either REQUESTED or SEARCHING_DRIVER.
      // triggerMatchingSideEffects transitions the ride to SEARCHING_DRIVER before
      // enqueuing the job, so by the time the worker picks it up the status is
      // already SEARCHING_DRIVER — the old REQUESTED-only guard always bailed out.
      const matchableStatuses = ['REQUESTED', 'SEARCHING_DRIVER'];
      if (!matchableStatuses.includes(ride.status as string)) {
        this.logger.log(
          `Ride ${rideId} is not in a matchable status (status: ${ride.status}) — skipping`,
        );
        return;
      }

      // Get declined drivers from Redis
      const declinedDrivers = await this.redis.getDeclinedDrivers(
        'ride',
        rideId,
      ); // BUG-3
      const allExcludedDrivers = [...excludeDriverIds, ...declinedDrivers];

      // Get pickup hex
      const pickupLat = jobSummary.pickupAddress?.lat;
      const pickupLng = jobSummary.pickupAddress?.lng;
      const dropoffLat = jobSummary.dropoffAddress?.lat;
      const dropoffLng = jobSummary.dropoffAddress?.lng;
      const pickupHex = this.geo.latLngToHex(pickupLat, pickupLng);
      this.logger.debug(`Pickup hex: ${pickupHex}`);

      // Expand in rings and search for driver
      const driverFound = await this.searchInRings(
        rideId,
        ride.customerId,
        pickupHex,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        jobSummary.distanceKm ?? 0,
        jobSummary.earnings,
        allExcludedDrivers,
        attempt,
      );

      if (driverFound) {
        this.logger.log(`Driver found for ride ${rideId}`);
      } else {
        // No driver found after all rings
        await this.handleNoDriverFound(
          rideId,
          jobSummary,
          attempt,
          ride.customerId,
          pickupHex,
          pickupLat,
          pickupLng,
        );
      }
    } catch (error) {
      this.logger.error(`Error matching ride ${rideId}:`, error);
      throw error;
    }
  }

  /**
   * Search for available drivers in expanding hex rings
   */
  private async searchInRings(
    rideId: string,
    customerId: string,
    centerHex: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    totalFare: number,
    excludeDriverIds: string[],
    attempt: number,
  ): Promise<boolean> {
    // Get hex rings (ring 0 to MAX_RINGS)
    const rings = this.geo.getHexRings(centerHex, this.MAX_RINGS);

    let totalAttempts = 0;

    for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
      const ring = rings[ringIndex];
      this.logger.debug(`Searching ring ${ringIndex} (${ring.length} hexes)`);
      for (const hexId of ring) {
        // Get drivers in this hex
        const driverIds = await this.redis.getDriversInHex(hexId);
        if (driverIds.length === 0) continue;
        // Filter out excluded drivers
        const candidateIds = driverIds.filter(
          (id) => !excludeDriverIds.includes(id),
        );
        if (candidateIds.length === 0) continue;
        // Get driver locations and sort by distance
        const candidates = await this.getDriverLocations(candidateIds);
        const sorted = this.geo.sortByDistance(
          pickupLat,
          pickupLng,
          candidates,
        );
        // Try to assign to closest available driver
        for (const driver of sorted) {
          totalAttempts++;
          if (totalAttempts > this.MAX_ATTEMPTS) {
            this.logger.warn(
              `Reached max attempts (${this.MAX_ATTEMPTS}) for ride ${rideId}`,
            );
            return false;
          }
          const assigned = await this.attemptAssignment(
            rideId,
            customerId,
            driver.id,
            hexId,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            distanceKm,
            totalFare,
            attempt,
          );
          if (assigned) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Atomically attempt to assign ride to driver
   */
  private async attemptAssignment(
    rideId: string,
    customerId: string,
    driverId: string,
    hexId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    totalFare: number,
    attempt: number,
  ): Promise<boolean> {
    // Execute atomic lock script
    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_LOCK_DRIVER,
        0,
        driverId,
        JobType.RIDE,
        rideId,
        hexId,
        REDIS_TTL.PENDING_ASSIGNMENT.toString(),
      );

    if (result === 1) {
      // Successfully locked driver
      this.logger.log(`Locked driver ${driverId} for ride ${rideId}`);

      // Write reverse mapping so cancelRide() can find the pending driver
      // even before they accept (while riderId is still null in the DB).
      await this.redis
        .getClient()
        .setex(
          `ride:${rideId}:pendingDriver`,
          REDIS_TTL.PENDING_ASSIGNMENT,
          driverId,
        );

      // BUG-3 fix: write ride:{rideId}:customer so getRideCustomer() returns correctly
      await this.redis.getClient().setex(
        `ride:${rideId}:customer`,
        REDIS_TTL.PENDING_ASSIGNMENT * 10, // keep longer than the ride itself
        customerId,
      );

      // Schedule assignment timeout using job-centric payload
      await this.queue.scheduleAssignmentTimeout(
        {
          job: {
            id: rideId,
            jobType: 'ride',
            pickupAddress: { lat: pickupLat, lng: pickupLng },
            dropoffAddress: { lat: dropoffLat, lng: dropoffLng },
            customerName: '',
            earnings: totalFare,
            distanceKm,
            status: 'assigned',
          },
          driverId, // BUG-1 fix: carry driverId so timeout processor can release without DB round-trip
          attempt, // BUG-2 fix: carry attempt count for proper retry incrementing
        },
        this.TIMEOUT_MS,
      );

      // Emit job.assigned event for socket notification
      this.eventBus.emitJobAssigned({
        jobId: rideId,
        jobType: 'ride',
        driverId,
        customerId, // now correctly populated from ride.customerId
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TIMEOUT_MS,
      });

      return true;
    } else if (result === -1) {
      // Driver already declined
      this.logger.debug(`Driver ${driverId} already declined ride ${rideId}`);
      return false;
    } else {
      // Driver not available (offline, active, or has pending assignment)
      this.logger.debug(`Driver ${driverId} not available (code: ${result})`);
      return false;
    }
  }

  /**
   * Get driver locations from Redis in parallel (BUG-7 fix).
   */
  private async getDriverLocations(
    driverIds: string[],
  ): Promise<Array<{ id: string; lat: number; lng: number }>> {
    const states = await Promise.all(
      driverIds.map((id) => this.redis.getDriverState(id).catch(() => null)),
    );
    return states
      .filter((s) => s !== null && s.location !== null)
      .map((s) => ({
        id: s!.id,
        lat: s!.location!.lat,
        lng: s!.location!.lng,
      }));
  }

  /**
   * Dump full Redis state for every known driver — called when no match is found.
   */
  private async dumpDriverDiagnostics(
    pickupHex: string,
    pickupLat: number,
    pickupLng: number,
  ): Promise<void> {
    try {
      const keys = await this.redis.getClient().keys('driver:*:status');
      if (keys.length === 0) {
        this.logger.debug('[DIAG] No drivers found in Redis at all');
        return;
      }

      this.logger.debug(
        `[DIAG] ${keys.length} driver(s) in Redis. Pickup hex: ${pickupHex} [${pickupLat}, ${pickupLng}]`,
      );

      for (const key of keys) {
        const driverId = key.split(':')[1];
        const state = await this.redis.getDriverState(driverId);
        if (!state) continue;

        const distKm = state.location
          ? this.geo
              .calculateDistance(
                pickupLat,
                pickupLng,
                state.location.lat,
                state.location.lng,
              )
              .toFixed(2)
          : 'unknown';

        const inHexSet = state.hexId
          ? (await this.redis.getDriversInHex(state.hexId)).includes(driverId)
          : false;

        this.logger.debug(
          `[DIAG] Driver ${driverId}: ` +
            `status=${state.status} ` +
            `hex=${state.hexId ?? 'none'} ` +
            `inHexSet=${inHexSet} ` +
            `pendingJob=${state.pendingJobId ?? 'none'} ` +
            `currentJob=${state.currentJobId ?? 'none'} ` +
            `location=${state.location ? `[${state.location.lat}, ${state.location.lng}]` : 'none'} ` +
            `distFromPickup=${distKm}km`,
        );
      }
    } catch (err) {
      this.logger.warn('[DIAG] Failed to dump driver diagnostics', err);
    }
  }

  /**
   * Handle case when no driver is found.
   * Retries up to MAX_MATCHING_RETRIES times with a delay before cancelling.
   */
  private async handleNoDriverFound(
    rideId: string,
    jobSummary: MatchRideJobData['job'],
    attempt: number,
    customerId?: string,
    pickupHex?: string,
    pickupLat?: number,
    pickupLng?: number,
  ): Promise<void> {
    const attempts = await this.redis.incrementMatchingAttempts(rideId);

    this.logger.warn(
      `No driver found for ride ${rideId} (attempt ${attempts}/${this.MAX_MATCHING_RETRIES})`,
    );

    // Always dump full driver state so we can see exactly why no match happened
    await this.dumpDriverDiagnostics(
      pickupHex ?? 'unknown',
      pickupLat ?? 0,
      pickupLng ?? 0,
    );
    if (attempts < this.MAX_MATCHING_RETRIES) {
      // Retry after a short delay to allow drivers to update position / come online
      this.logger.log(
        `Retrying ride matching for ${rideId} (attempt ${attempts + 1}) in ${this.RETRY_DELAY_MS}ms`,
      );
      await this.queue.enqueueRideMatching(
        { job: jobSummary, attempt: attempts + 1 },
        this.RETRY_DELAY_MS,
      );
      return;
    }

    this.logger.warn(
      `Cancelling ride ${rideId} — no driver found after ${attempts} attempts`,
    );

    // BUG-10 fix: use CANCELLED_BY_SYSTEM — distinct from customer-initiated cancellations
    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED_BY_SYSTEM',
        cancellationReason: 'No driver available',
        cancelledBy: 'SYSTEM',
        cancelledAt: new Date(),
      },
    });

    // Emit job cancelled event — include customerId so listeners can notify the customer
    this.eventBus.emitJobCancelled({
      jobId: rideId,
      jobType: 'ride',
      reason: 'No driver available',
      cancelledBy: 'system',
      customerId,
      timestamp: Date.now(),
    });
  }
}
