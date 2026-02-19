import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RideStatus, DeliveryStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rider accepts a job (delivery or ride).
   * - delivery: ASSIGNED → ACCEPTED
   * - ride: REQUESTED or ASSIGNED → ACCEPTED (riderId set if not already)
   */
  async acceptJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.riderId && delivery.riderId !== riderId) {
        throw new ForbiddenException(
          'This job is assigned to a different rider',
        );
      }

      const acceptableStatuses: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.REQUESTED,
      ];

      if (!acceptableStatuses.includes(delivery.status)) {
        throw new BadRequestException(
          `Cannot accept delivery in status ${delivery.status}`,
        );
      }

      return this.prisma.delivery.update({
        where: { id: jobId },
        data: {
          status: DeliveryStatus.ACCEPTED,
          riderId, // ensure riderId is set (handles both assigned and re-accept)
        },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
        },
      });
    }

    if (jobType === 'ride') {
      // For matching-pipeline rides: riderId is null, status is REQUESTED
      // For admin-assigned rides: riderId is already set, status may be ASSIGNED
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        include: { rider: { include: { vehicle: true } } },
      });

      if (!ride) throw new NotFoundException('Ride not found');

      // If assigned to a specific rider, enforce it
      if (ride.riderId && ride.riderId !== riderId) {
        throw new ForbiddenException(
          'This ride is assigned to a different rider',
        );
      }

      const acceptableStatuses: RideStatus[] = [
        RideStatus.REQUESTED,
        // ASSIGNED is not a standard RideStatus in Prisma but guard just in case
      ];

      if (!acceptableStatuses.includes(ride.status as RideStatus)) {
        throw new BadRequestException(
          `Cannot accept ride in status ${ride.status}`,
        );
      }

      const result = await this.prisma.ride.updateMany({
        where: {
          id: jobId,
          status: { in: [RideStatus.REQUESTED] },
        },
        data: {
          status: RideStatus.ACCEPTED,
          riderId,
          acceptedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new BadRequestException('Ride already accepted or unavailable');
      }

      return this.prisma.ride.findUnique({
        where: { id: jobId },
        include: { rider: { include: { vehicle: true } } },
      });
    }

    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider declines a job (delivery or ride).
   * - delivery: revert to REQUESTED, clear riderId
   * - ride: no DB change needed; matching pipeline handles re-queuing via Redis declined list
   */
  async declineJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.riderId && delivery.riderId !== riderId) {
        throw new ForbiddenException(
          'This job is assigned to a different rider',
        );
      }

      const declineableStatuses: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.REQUESTED,
      ];

      if (!declineableStatuses.includes(delivery.status)) {
        throw new BadRequestException(
          `Cannot decline delivery in status ${delivery.status}`,
        );
      }

      // Clear the rider assignment and revert to REQUESTED so it can be reassigned
      return this.prisma.delivery.update({
        where: { id: jobId },
        data: {
          status: DeliveryStatus.REQUESTED,
          riderId: null,
          assignedAt: null,
        },
      });
    }

    if (jobType === 'ride') {
      // For rides: decline is handled client-side via Redis and the matching pipeline.
      // We just return success — the matching worker reads the Redis declined list.
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');

      // Rider can only decline rides in REQUESTED state
      if (ride.status !== RideStatus.REQUESTED) {
        throw new BadRequestException(
          `Cannot decline ride in status ${ride.status}`,
        );
      }

      return { success: true, message: 'Ride declined' };
    }

    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider cancels an active job with a reason.
   * - delivery: moves to CANCELLED, records reason
   * - ride: moves to CANCELLED, records reason
   */
  async cancelJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
    reason: string,
  ) {
    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) throw new NotFoundException('Delivery not found');

      if (delivery.riderId !== riderId) {
        throw new ForbiddenException('You are not assigned to this delivery');
      }

      const cancellable: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
      ];

      if (!cancellable.includes(delivery.status)) {
        throw new BadRequestException(
          `Cannot cancel delivery in status ${delivery.status}`,
        );
      }

      return this.prisma.delivery.update({
        where: { id: jobId },
        data: {
          status: DeliveryStatus.CANCELLED,
          riderId: null,
        },
      });
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');

      if (ride.riderId !== riderId) {
        throw new ForbiddenException('You are not assigned to this ride');
      }

      const cancellable: RideStatus[] = [
        RideStatus.ACCEPTED,
        RideStatus.ARRIVED,
        RideStatus.IN_PROGRESS,
      ];

      if (!cancellable.includes(ride.status as RideStatus)) {
        throw new BadRequestException(
          `Cannot cancel ride in status ${ride.status}`,
        );
      }

      return this.prisma.ride.update({
        where: { id: jobId },
        data: {
          status: RideStatus.CANCELLED,
          cancellationReason: reason,
          cancelledBy: riderId,
          cancelledAt: new Date(),
          riderId: null,
        },
      });
    }

    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }
}
