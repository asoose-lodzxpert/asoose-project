import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  MatchDeliveryJobData,
} from '../queue/queue.constants';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ATOMIC_ASSIGN_DELIVERY } from '../redis/lua-scripts';
import { REDIS_TTL } from '../redis/redis-keys.constants';

/**
 * Delivery Matching Worker
 *
 * Same algorithm as ride matching, but for deliveries.
 */
@Processor(QUEUE_NAMES.DELIVERY_MATCHING, {
  concurrency: 10,
  limiter: {
    max: 50,
    duration: 1000,
  },
})
export class DeliveryMatchingProcessor extends WorkerHost {
  private readonly logger = new Logger(DeliveryMatchingProcessor.name);

  private readonly MAX_RINGS = 5;
  private readonly MAX_ATTEMPTS = 20;
  private readonly TIMEOUT_MS = 90000; // 90 seconds
  private readonly MAX_MATCHING_RETRIES = 5; // Max fast retries before switching to long-wait queue
  private readonly RETRY_DELAY_MS = 10_000; // 10s between fast retries
  private readonly LONG_RETRY_DELAY_MS = 20 * 60 * 1000; // 20 minutes — used when no rider found after fast retries

  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<MatchDeliveryJobData>): Promise<void> {
    const { job: jobSummary, attempt, excludeDriverIds = [] } = job.data;
    const deliveryId = jobSummary.id;
    this.logger.log(`🔍 Matching delivery ${deliveryId} (attempt ${attempt})`);

    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: {
          status: true,
          riderId: true,
          customerId: true,
          orderId: true,
        },
      });

      if (!delivery) {
        this.logger.error(`Delivery ${deliveryId} not found`);
        return;
      }

      if (delivery.status !== 'REQUESTED') {
        this.logger.log(
          `Delivery ${deliveryId} no longer REQUESTED (status: ${delivery.status})`,
        );
        return;
      }

      // Get declined drivers
      const declinedDrivers = await this.redis.getDeclinedDrivers(
        'delivery',
        deliveryId,
      ); // BUG-3
      const allExcludedDrivers = [...excludeDriverIds, ...declinedDrivers];

      // Get pickup hex
      const pickupLat = jobSummary.pickupAddress?.lat;
      const pickupLng = jobSummary.pickupAddress?.lng;
      const dropoffLat = jobSummary.dropoffAddress?.lat;
      const dropoffLng = jobSummary.dropoffAddress?.lng;
      const pickupHex = this.geo.latLngToHex(pickupLat, pickupLng);

      // Search in rings
      const driverFound = await this.searchInRings(
        deliveryId,
        delivery.customerId ?? '',
        pickupHex,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        jobSummary.distanceKm ?? 0,
        jobSummary.earnings,
        jobSummary.packageDetails,
        jobSummary.customerName,
        jobSummary.customerPhone ?? '',
        allExcludedDrivers,
        attempt,
      );

      if (driverFound) {
        this.logger.log(`✅ Driver found for delivery ${deliveryId}`);
      } else {
        await this.handleNoDriverFound(deliveryId, jobSummary, attempt);
      }
    } catch (error) {
      this.logger.error(`Error matching delivery ${deliveryId}:`, error);
      throw error;
    }
  }

  private async searchInRings(
    deliveryId: string,
    customerId: string,
    centerHex: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    deliveryFee: number,
    packageDetails: string | undefined,
    recipientName: string,
    recipientPhone: string,
    excludeDriverIds: string[],
    attempt: number,
  ): Promise<boolean> {
    const rings = this.geo.getHexRings(centerHex, this.MAX_RINGS);
    let totalAttempts = 0;

    for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
      const ring = rings[ringIndex];
      for (const hexId of ring) {
        // Delivery uses the RIDER hex set (hex:{id}:riders), not the driver set
        const riderIds = await this.redis.getRidersInHex(hexId);
        if (riderIds.length === 0) continue;
        const candidateIds = riderIds.filter(
          (id) => !excludeDriverIds.includes(id),
        );
        if (candidateIds.length === 0) continue;
        const candidates = await this.getRiderLocations(candidateIds);
        const sorted = this.geo.sortByDistance(
          pickupLat,
          pickupLng,
          candidates,
        );
        for (const driver of sorted) {
          totalAttempts++;
          if (totalAttempts > this.MAX_ATTEMPTS) {
            return false;
          }
          const assigned = await this.attemptAssignment(
            deliveryId,
            customerId,
            driver.id,
            hexId,
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
            distanceKm,
            deliveryFee,
            packageDetails,
            recipientName,
            recipientPhone,
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

  private async attemptAssignment(
    deliveryId: string,
    customerId: string,
    riderId: string,
    hexId: string,
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    distanceKm: number,
    deliveryFee: number,
    packageDetails: string | undefined,
    recipientName: string,
    recipientPhone: string,
    attempt: number,
  ): Promise<boolean> {
    // Use ATOMIC_ASSIGN_DELIVERY — operates on rider:* keys and hex:*:riders sets
    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_ASSIGN_DELIVERY,
        0,
        riderId,
        deliveryId,
        hexId,
        REDIS_TTL.PENDING_ASSIGNMENT.toString(),
      );

    if (result === 1) {
      this.logger.log(`🔒 Locked rider ${riderId} for delivery ${deliveryId}`);

      // Write reverse mapping so cancellations can find and release the locked rider
      // before they accept (while riderId is still null in the DB).
      await this.redis
        .getClient()
        .setex(
          `delivery:${deliveryId}:pendingRider`,
          REDIS_TTL.PENDING_ASSIGNMENT,
          riderId,
        );

      // Schedule timeout using job-centric payload
      await this.queue.scheduleAssignmentTimeout(
        {
          job: {
            id: deliveryId,
            jobType: 'delivery',
            pickupAddress: { lat: pickupLat, lng: pickupLng },
            dropoffAddress: { lat: dropoffLat, lng: dropoffLng },
            customerName: recipientName,
            customerPhone: recipientPhone,
            earnings: deliveryFee,
            distanceKm,
            packageDetails,
            status: 'assigned',
          },
          driverId: riderId, // BUG-1 fix: carry riderId so timeout can release without DB round-trip
          attempt, // BUG-2 fix: carry attempt count
        },
        this.TIMEOUT_MS,
      );

      // Emit job.assigned event — driverId field carries the riderId for socket routing
      this.eventBus.emitJobAssigned({
        jobId: deliveryId,
        jobType: 'delivery',
        driverId: riderId,
        customerId: customerId,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.TIMEOUT_MS,
      });

      return true;
    }

    return false;
  }

  /** Read rider locations from rider:* Redis namespace (delivery workers only) */
  private async getRiderLocations(
    riderIds: string[],
  ): Promise<Array<{ id: string; lat: number; lng: number }>> {
    const locations: Array<{ id: string; lat: number; lng: number }> = [];

    for (const riderId of riderIds) {
      const state = await this.redis.getRiderState(riderId);
      if (state?.location) {
        locations.push({
          id: riderId,
          lat: state.location.lat,
          lng: state.location.lng,
        });
      }
    }

    return locations;
  }

  private async handleNoDriverFound(
    deliveryId: string,
    jobSummary: MatchDeliveryJobData['job'],
    attempt: number,
  ): Promise<void> {
    const attempts = await this.redis.incrementMatchingAttempts(deliveryId);

    this.logger.warn(
      `❌ No driver found for delivery ${deliveryId} (attempt ${attempts}/${this.MAX_MATCHING_RETRIES})`,
    );

    if (attempts < this.MAX_MATCHING_RETRIES) {
      // Fast retry — try again after a short delay
      this.logger.log(
        `Retrying delivery matching for ${deliveryId} (attempt ${attempts + 1}) in ${this.RETRY_DELAY_MS}ms`,
      );
      await this.queue.enqueueDeliveryMatching(
        { job: jobSummary, attempt: attempts + 1 },
        this.RETRY_DELAY_MS,
      );
      return;
    }

    // All fast retries exhausted — do NOT cancel. Queue for another cycle in 20 minutes.
    // This allows a rider to come online later and pick up the delivery.
    this.logger.warn(
      `No driver found after ${attempts} fast attempts for delivery ${deliveryId} — scheduling long retry in 20 min`,
    );

    // Reset attempt counter so the next cycle starts fresh fast-retries
    await this.redis.resetMatchingAttempts(deliveryId);

    await this.queue.enqueueDeliveryMatching(
      { job: jobSummary, attempt: 1, excludeDriverIds: [] },
      this.LONG_RETRY_DELAY_MS,
    );
  }
}
