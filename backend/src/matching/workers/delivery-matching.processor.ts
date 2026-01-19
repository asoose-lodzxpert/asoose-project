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
import { ATOMIC_LOCK_DRIVER } from '../redis/lua-scripts';
import { REDIS_TTL, TripType } from '../redis/redis-keys.constants';

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
    const {
      deliveryId,
      customerId,
      orderId,
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
      excludeDriverIds = [],
    } = job.data;

    this.logger.log(`🔍 Matching delivery ${deliveryId} (attempt ${attempt})`);

    try {
      // Acquire global trip lock
      const locked = await this.redis.setTripLock(
        TripType.DELIVERY,
        deliveryId,
      );
      if (!locked) {
        this.logger.warn(`Delivery ${deliveryId} is already being matched`);
        return;
      }

      // Verify delivery status
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { status: true, riderId: true },
      });

      if (!delivery) {
        this.logger.error(`Delivery ${deliveryId} not found`);
        await this.redis.releaseTripLock(TripType.DELIVERY, deliveryId);
        return;
      }

      if (delivery.status !== 'REQUESTED') {
        this.logger.log(
          `Delivery ${deliveryId} no longer REQUESTED (status: ${delivery.status})`,
        );
        await this.redis.releaseTripLock(TripType.DELIVERY, deliveryId);
        return;
      }

      // Get declined drivers
      const declinedDrivers = await this.redis.getDeclinedDrivers(
        TripType.DELIVERY,
        deliveryId,
      );
      const allExcludedDrivers = [...excludeDriverIds, ...declinedDrivers];

      // Get pickup hex
      const pickupHex = this.geo.latLngToHex(pickupLat, pickupLng);

      // Search in rings
      const driverFound = await this.searchInRings(
        deliveryId,
        customerId,
        orderId,
        pickupHex,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        distanceKm,
        deliveryFee,
        packageDetails,
        recipientName,
        recipientPhone,
        allExcludedDrivers,
      );

      if (driverFound) {
        this.logger.log(`✅ Driver found for delivery ${deliveryId}`);
      } else {
        await this.handleNoDriverFound(
          deliveryId,
          customerId,
          orderId,
          pickupLat,
          pickupLng,
          attempt,
        );
      }

      await this.redis.releaseTripLock(TripType.DELIVERY, deliveryId);
    } catch (error) {
      this.logger.error(`Error matching delivery ${deliveryId}:`, error);
      await this.redis.releaseTripLock(TripType.DELIVERY, deliveryId);
      throw error;
    }
  }

  private async searchInRings(
    deliveryId: string,
    customerId: string,
    orderId: string | undefined,
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
  ): Promise<boolean> {
    const rings = this.geo.getHexRings(centerHex, this.MAX_RINGS);
    let totalAttempts = 0;

    for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
      const ring = rings[ringIndex];

      for (const hexId of ring) {
        const driverIds = await this.redis.getDriversInHex(hexId);

        if (driverIds.length === 0) continue;

        const candidateIds = driverIds.filter(
          (id) => !excludeDriverIds.includes(id),
        );

        if (candidateIds.length === 0) continue;

        const candidates = await this.getDriverLocations(candidateIds);
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
            orderId,
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
    orderId: string | undefined,
    driverId: string,
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
  ): Promise<boolean> {
    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_LOCK_DRIVER,
        0,
        driverId,
        TripType.DELIVERY,
        deliveryId,
        hexId,
        REDIS_TTL.PENDING_ASSIGNMENT.toString(),
      );

    if (result === 1) {
      this.logger.log(
        `🔒 Locked driver ${driverId} for delivery ${deliveryId}`,
      );

      // Schedule timeout
      await this.queue.scheduleAssignmentTimeout(
        {
          tripType: TripType.DELIVERY,
          tripId: deliveryId,
          driverId,
          scheduledFor: Date.now() + this.TIMEOUT_MS,
        },
        this.TIMEOUT_MS,
      );

      // Emit event
      this.eventBus.emitDeliveryAssignmentRequested({
        deliveryId,
        driverId,
        customerId,
        orderId,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        deliveryFee,
        distanceKm,
        packageDetails,
        recipientName,
        recipientPhone,
        expiresAt: Date.now() + this.TIMEOUT_MS,
        timestamp: Date.now(),
      });

      return true;
    }

    return false;
  }

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

  private async handleNoDriverFound(
    deliveryId: string,
    customerId: string,
    orderId: string | undefined,
    pickupLat: number,
    pickupLng: number,
    attempt: number,
  ): Promise<void> {
    const attempts = await this.redis.incrementMatchingAttempts(
      TripType.DELIVERY,
      deliveryId,
    );

    this.logger.warn(
      `❌ No driver found for delivery ${deliveryId} (attempt ${attempts})`,
    );

    // Update delivery status
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'CANCELLED' },
    });

    // If linked to order, update order status
    if (orderId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    }

    this.eventBus.emitDeliveryNoDriverFound({
      deliveryId,
      customerId,
      orderId,
      pickupLat,
      pickupLng,
      attempts,
      timestamp: Date.now(),
    });
  }
}
