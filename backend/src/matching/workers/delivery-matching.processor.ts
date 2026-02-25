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
  private readonly MAX_MATCHING_RETRIES = 5; // Max full re-queued attempts before cancel
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
        await this.handleNoDriverFound(
          deliveryId,
          jobSummary,
          attempt,
          delivery.orderId ?? undefined,
        );
      }
    } catch (error) {
      this.logger.error(`Error matching delivery ${deliveryId}:`, error);
      throw error;
    }
  }

  private async searchInRings(
    deliveryId: string,
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
        customerId: recipientName,
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
    orderId: string | undefined,
  ): Promise<void> {
    const attempts = await this.redis.incrementMatchingAttempts(deliveryId);

    this.logger.warn(
      `❌ No driver found for delivery ${deliveryId} (attempt ${attempts}/${this.MAX_MATCHING_RETRIES})`,
    );

    if (attempts < this.MAX_MATCHING_RETRIES) {
      this.logger.log(
        `Retrying delivery matching for ${deliveryId} (attempt ${attempts + 1}) in ${this.RETRY_DELAY_MS}ms`,
      );
      await this.queue.enqueueDeliveryMatching(
        { job: jobSummary, attempt: attempts + 1 },
        this.RETRY_DELAY_MS,
      );
      return;
    }

    this.logger.warn(
      `Cancelling delivery ${deliveryId} — no driver found after ${attempts} attempts`,
    );

    // Update delivery status
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'CANCELLED' },
    });

    // If linked to order, update order status
    if (orderId) {
      await this.prisma.order.update({
        where: { id: String(orderId) },
        data: { status: 'CANCELLED' },
      });
    }

    // Emit cancellation event so customers are notified via socket
    this.eventBus.emitJobCancelled({
      jobId: deliveryId,
      jobType: 'delivery',
      reason: 'No driver available',
      cancelledBy: 'system',
      timestamp: Date.now(),
    });
  }
}
