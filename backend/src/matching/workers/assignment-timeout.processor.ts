import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  HandleAssignmentTimeoutJobData,
} from '../queue/queue.constants';
import { DriverStateService } from '../driver-state/driver-state.service';
import { QueueService } from '../queue/queue.service';
import { TripType } from '../redis/redis-keys.constants';
import {
  MatchRideJobData,
  MatchDeliveryJobData,
} from '../queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Assignment Timeout Handler
 *
 * Handles driver assignment timeouts after 90 seconds.
 * If driver hasn't accepted/declined, auto-decline and retry matching.
 */
@Processor(QUEUE_NAMES.ASSIGNMENT_TIMEOUT, {
  concurrency: 5,
})
export class AssignmentTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentTimeoutProcessor.name);

  constructor(
    private readonly driverState: DriverStateService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<HandleAssignmentTimeoutJobData>): Promise<void> {
    const { tripType, tripId, driverId } = job.data;

    this.logger.log(
      `⏱️  Handling assignment timeout: ${tripType} ${tripId} for driver ${driverId}`,
    );

    try {
      // Trigger timeout in driver state (same as decline)
      await this.driverState.handleAssignmentTimeout(
        driverId,
        tripType as TripType,
        tripId,
      );

      // Re-enqueue matching job to find another driver
      if (tripType === 'ride') {
        await this.retryRideMatching(tripId, driverId);
      } else {
        await this.retryDeliveryMatching(tripId, driverId);
      }
    } catch (error) {
      this.logger.error(
        `Error handling timeout for ${tripType} ${tripId}:`,
        error,
      );
      // Don't throw - timeout already occurred
    }
  }

  private async retryRideMatching(
    rideId: string,
    timedOutDriverId: string,
  ): Promise<void> {
    // Get ride details
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!ride) {
      this.logger.error(`Ride ${rideId} not found`);
      return;
    }

    if (ride.status !== 'REQUESTED') {
      this.logger.log(`Ride ${rideId} no longer REQUESTED, skipping retry`);
      return;
    }

    // Re-enqueue with incremented attempt
    const distanceKm = ride.distanceKm || 0;

    await this.queue.enqueueRideMatching({
      rideId,
      customerId: ride.customerId,
      pickupLat: ride.pickupAddress.lat,
      pickupLng: ride.pickupAddress.lng,
      dropoffLat: ride.dropoffAddress.lat,
      dropoffLng: ride.dropoffAddress.lng,
      distanceKm,
      totalFare: ride.totalFare || 0,
      attempt: 2, // Retry attempt
      excludeDriverIds: [timedOutDriverId],
    } as MatchRideJobData);

    this.logger.log(
      `🔄 Retry ride matching for ${rideId} (excluded driver: ${timedOutDriverId})`,
    );
  }

  private async retryDeliveryMatching(
    deliveryId: string,
    timedOutDriverId: string,
  ): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery) {
      this.logger.error(`Delivery ${deliveryId} not found`);
      return;
    }

    if (delivery.status !== 'REQUESTED') {
      this.logger.log(
        `Delivery ${deliveryId} no longer REQUESTED, skipping retry`,
      );
      return;
    }

    const distanceKm = delivery.distanceKm || 0;

    await this.queue.enqueueDeliveryMatching({
      deliveryId,
      customerId: delivery.customerId,
      orderId: delivery.orderId || undefined,
      pickupLat: delivery.pickupAddress.lat,
      pickupLng: delivery.pickupAddress.lng,
      dropoffLat: delivery.dropoffAddress.lat,
      dropoffLng: delivery.dropoffAddress.lng,
      distanceKm,
      deliveryFee: delivery.deliveryFee,
      packageDetails: delivery.packageDetails || undefined,
      recipientName: delivery.recipientName,
      recipientPhone: delivery.recipientPhone,
      attempt: 2,
      excludeDriverIds: [timedOutDriverId],
    } as MatchDeliveryJobData);

    this.logger.log(
      `🔄 Retry delivery matching for ${deliveryId} (excluded driver: ${timedOutDriverId})`,
    );
  }
}
