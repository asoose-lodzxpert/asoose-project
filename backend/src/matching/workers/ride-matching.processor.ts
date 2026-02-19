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

      if (ride.status !== 'REQUESTED') {
        this.logger.log(
          `Ride ${rideId} no longer REQUESTED (status: ${ride.status})`,
        );
        return;
      }

      // Get declined drivers from Redis
      const declinedDrivers = await this.redis.getDeclinedDrivers(rideId);
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
        pickupHex,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        jobSummary.distanceKm ?? 0,
        jobSummary.earnings,
        allExcludedDrivers,
      );

      if (driverFound) {
        this.logger.log(`Driver found for ride ${rideId}`);
      } else {
        // No driver found after all rings
        await this.handleNoDriverFound(
          rideId,
          pickupLat,
          pickupLng,
          attempt,
          ride.customerId,
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
    centerHex: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    totalFare: number,
    excludeDriverIds: string[],
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
            driver.id,
            hexId,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            distanceKm,
            totalFare,
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
    driverId: string,
    hexId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    totalFare: number,
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
        },
        this.TIMEOUT_MS,
      );

      // Emit job.assigned event for socket notification
      this.eventBus.emitJobAssigned({
        jobId: rideId,
        jobType: 'ride',
        driverId,
        customerId: '', // Will be populated if available from job context
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
   * Get driver locations from Redis
   */
  private async getDriverLocations(
    driverIds: string[],
  ): Promise<Array<{ id: string; lat: number; lng: number }>> {
    const locations: Array<{ id: string; lat: number; lng: number }> = [];

    for (const driverId of driverIds) {
      const state = await this.redis.getDriverState(driverId);
      if (state?.location) {
        locations.push({
          id: driverId,
          lat: state.location.lat,
          lng: state.location.lng,
        });
      }
    }

    return locations;
  }

  /**
   * Handle case when no driver is found
   */
  private async handleNoDriverFound(
    rideId: string,
    pickupLat: number,
    pickupLng: number,
    attempt: number,
    customerId?: string,
  ): Promise<void> {
    const attempts = await this.redis.incrementMatchingAttempts(rideId);

    this.logger.warn(
      `No driver found for ride ${rideId} (attempt ${attempts})`,
    );

    // Update ride status to CANCELLED
    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED',
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
