import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RideStatus, DeliveryStatus } from '@prisma/client';
import { AppLogger } from 'src/libs/logger/app-logger.service';
import { TransactionLedgerService } from 'src/super-admin/transactions/transaction-ledger.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { DriverStateService } from '../../matching/driver-state/driver-state.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/** Maps a Prisma DeliveryStatus to the rider-app's JobStatus string */
function deliveryStatusToJobStatus(status: DeliveryStatus): string {
  switch (status) {
    case DeliveryStatus.ASSIGNED:
    case DeliveryStatus.REQUESTED:
      return 'incoming-job';
    case DeliveryStatus.ACCEPTED:
      return 'en-route-pickup';
    case DeliveryStatus.PICKED_UP:
      return 'en-route-dropoff';
    default:
      return 'online-waiting';
  }
}

/** Maps a Prisma RideStatus to the rider-app's JobStatus string */
function rideStatusToJobStatus(status: RideStatus): string {
  switch (status) {
    case RideStatus.REQUESTED:
    case RideStatus.SEARCHING_DRIVER:
      return 'incoming-job';
    case RideStatus.DRIVER_ACCEPTED:
      return 'en-route-pickup';
    case RideStatus.PAID:
    case RideStatus.ACCEPTED: // legacy
    case RideStatus.ARRIVED: // legacy
      return 'at-pickup';
    case RideStatus.IN_PROGRESS:
      return 'en-route-dropoff';
    default:
      return 'online-waiting';
  }
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly transactionLedger: TransactionLedgerService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly driverStateService: DriverStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Returns the currently active job (delivery or ride) for a rider / driver.
   */
  async getActiveJob(riderId: string, role: 'RIDER' | 'DRIVER') {
    this.logger.debug(`getActiveJob called - riderId=${riderId}, role=${role}`);

    if (role === 'RIDER') {
      this.logger.debug(`Checking for active delivery - rider ${riderId}`);

      const activeStatuses: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
        DeliveryStatus.IN_TRANSIT,
      ];

      const delivery = await this.prisma.delivery.findFirst({
        where: {
          riderId,
          status: { in: activeStatuses },
        },
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
          order: { include: { store: { include: { vendor: true } } } },
        },
        orderBy: { assignedAt: 'desc' },
      });

      if (!delivery) {
        this.logger.debug(`No active delivery found for rider ${riderId}`);
        return null;
      }

      this.logger.debug(
        `Active delivery found - id=${delivery.id}, status=${delivery.status}`,
      );

      this.logger.debug(JSON.stringify(delivery, null, 2));

      const stops = (delivery as any).stops as any[] | null;
      const isMultiStop = stops && stops.length > 1;

      const result = {
        id: delivery.id,
        jobType: 'delivery' as const,
        status: deliveryStatusToJobStatus(delivery.status),
        customerName: isMultiStop
          ? `${stops!.length} Stores`
          : (delivery as any).order?.store?.name ||
            delivery.customer?.name ||
            'Store',
        customerPhone: delivery.customer?.phone ?? delivery.recipientPhone,
        pickupContactPhone:
          delivery.pickupAddress?.phone ||
          (delivery as any).order?.store?.vendor?.phone ||
          delivery.customer?.phone ||
          undefined,
        dropoffContactPhone: delivery.recipientPhone || undefined,
        recipientName: delivery.recipientName || undefined,
        pickupAddress: delivery.pickupAddress,
        dropoffAddress: delivery.dropoffAddress,
        earnings: delivery.deliveryFee,

        requiresOtp: false,
        packageDetails: delivery.packageDetails ?? undefined,
        distanceKm: delivery.distanceKm ?? undefined,
        assignedAt: delivery.assignedAt ?? undefined,
        pickedUpAt: delivery.pickedUpAt ?? undefined,
        stops: stops ?? null,
        currentStopIndex: (delivery as any).currentStopIndex ?? 0,
        orderGroupId: (delivery as any).orderGroupId ?? null,
      };

      this.logger.debug(`Returning delivery job ${delivery.id}`);
      return result;
    }

    if (role === 'DRIVER') {
      this.logger.debug(`Checking for active ride - driver ${riderId}`);

      const activeStatuses: RideStatus[] = [
        RideStatus.SEARCHING_DRIVER,
        RideStatus.DRIVER_ACCEPTED,
        RideStatus.PAID,
        RideStatus.IN_PROGRESS,
        // Legacy statuses kept for backward compatibility
        RideStatus.REQUESTED,
        RideStatus.ACCEPTED,
        RideStatus.ARRIVED,
      ];

      const ride = await this.prisma.ride.findFirst({
        where: {
          riderId,
          status: { in: activeStatuses },
        },
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!ride) {
        this.logger.debug(`No active ride found for driver ${riderId}`);
        return null;
      }

      this.logger.debug(
        `Active ride found - id=${ride.id}, status=${ride.status}`,
      );

      const result = {
        id: ride.id,
        jobType: 'ride' as const,
        status: rideStatusToJobStatus(ride.status as RideStatus),
        customerName: ride.customer?.name ?? 'Customer',
        customerPhone: ride.customer?.phone ?? undefined,
        pickupAddress: ride.pickupAddress,
        dropoffAddress: ride.dropoffAddress,
        earnings: ride.totalFare ?? ride.baseFare ?? 0,
        startOtp: ride.startOtp ?? undefined,
        distanceKm: ride.distanceKm ?? undefined,
      };

      this.logger.debug(`Returning ride job ${ride.id}`);
      return result;
    }

    this.logger.warn(
      `getActiveJob - invalid role: ${role} for riderId ${riderId}`,
    );
    return null;
  }

  /**
   * Rider accepts a job (delivery or ride).
   */
  async acceptJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    this.logger.debug(
      `acceptJob - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) {
        this.logger.warn(`acceptJob - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId && delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - delivery ${jobId} assigned to ${delivery.riderId}, requested by ${riderId}`,
        );
        throw new ForbiddenException(
          'This job is assigned to a different rider',
        );
      }

      const acceptable: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.REQUESTED,
      ];
      if (!acceptable.includes(delivery.status)) {
        this.logger.warn(
          `Invalid state - cannot accept delivery ${jobId} in status ${delivery.status}`,
        );
        throw new BadRequestException(
          `Cannot accept delivery in status ${delivery.status}`,
        );
      }

      this.logger.debug(
        `Updating delivery ${jobId} → ACCEPTED, rider=${riderId}`,
      );

      const updatedDelivery = await this.prisma.delivery.update({
        where: { id: jobId },
        data: {
          status: DeliveryStatus.ACCEPTED,
          riderId,
        },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
        },
      });

      // Update linked order status to DISPATCHED
      if (delivery.orderId) {
        await this.prisma.order.update({
          where: { id: delivery.orderId },
          data: { status: 'DISPATCHED' },
        });
        this.logger.debug(`Order ${delivery.orderId} status → DISPATCHED`);
      }

      return updatedDelivery;
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        include: { rider: { include: { vehicle: true } } },
      });

      if (!ride) {
        this.logger.warn(`acceptJob - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId && ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - ride ${jobId} assigned to ${ride.riderId}, requested by ${riderId}`,
        );
        throw new ForbiddenException(
          'This ride is assigned to a different rider',
        );
      }

      const acceptable: string[] = [
        'SEARCHING_DRIVER',
        'DRIVER_ASSIGNED', // admin manual assignment
      ];
      if (!acceptable.includes(ride.status as string)) {
        this.logger.warn(
          `Invalid state - cannot accept ride ${jobId} in status ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot accept ride in status ${ride.status}`,
        );
      }

      this.logger.debug(
        `Accepting ride ${jobId} → DRIVER_ACCEPTED, rider=${riderId}`,
      );

      const updateResult = await this.prisma.ride.updateMany({
        where: {
          id: jobId,
          status: { in: ['SEARCHING_DRIVER', 'DRIVER_ASSIGNED'] as any[] },
        },
        data: {
          status: 'DRIVER_ACCEPTED' as any,
          riderId,
          acceptedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        this.logger.warn(
          `Race condition - ride ${jobId} no longer available for accept`,
        );
        throw new BadRequestException('Ride already accepted or unavailable');
      }

      const updatedRide = await this.prisma.ride.findUnique({
        where: { id: jobId },
        include: { rider: { include: { vehicle: true } } },
      });

      // Notify customer that a driver is on the way
      if (updatedRide?.customerId && updatedRide.rider) {
        try {
          this.notificationsGateway.server
            .to(`user_${updatedRide.customerId}`)
            .emit('DRIVER_ACCEPTED', {
              type: 'DRIVER_ACCEPTED',
              rideId: updatedRide.id,
              driver: {
                id: updatedRide.rider.id,
                name: updatedRide.rider.name,
                phone: updatedRide.rider.phone,
                vehicle: updatedRide.rider.vehicle,
              },
              message: 'A driver has accepted your ride and is on the way.',
            });
          this.logger.debug(
            `Emitted DRIVER_ACCEPTED to customer user_${updatedRide.customerId} for ride ${jobId}`,
          );
        } catch (e) {
          this.logger.error(
            'Socket error during acceptJob DRIVER_ACCEPTED emit',
            e,
          );
        }
      }

      return updatedRide;
    }

    this.logger.error(`acceptJob - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider declines a job.
   */
  async declineJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    this.logger.debug(
      `declineJob - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) {
        this.logger.warn(`declineJob - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId && delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden decline - delivery ${jobId} belongs to ${delivery.riderId}`,
        );
        throw new ForbiddenException(
          'This job is assigned to a different rider',
        );
      }

      const declineable: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.REQUESTED,
      ];

      // Already cancelled — treat as success (idempotent)
      if (delivery.status === DeliveryStatus.CANCELLED) {
        this.logger.debug(
          `declineJob - delivery ${jobId} already CANCELLED, skipping`,
        );
        return { success: true, message: 'Delivery already ended' };
      }

      if (!declineable.includes(delivery.status)) {
        this.logger.warn(
          `Invalid state - cannot decline delivery ${jobId} in ${delivery.status}`,
        );
        throw new BadRequestException(
          `Cannot decline delivery in status ${delivery.status}`,
        );
      }

      this.logger.debug(
        `Declining delivery ${jobId} → REQUESTED, clearing rider assignment`,
      );

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
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true },
      });

      if (!ride) {
        this.logger.warn(`declineJob - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      // Already in a terminal state — treat as success (idempotent)
      const terminalRideStatuses = [
        'CANCELLED_BY_USER',
        'CANCELLED_BY_DRIVER',
        'CANCELLED',
        'COMPLETED',
      ];
      if (terminalRideStatuses.includes(ride.status as string)) {
        this.logger.debug(
          `declineJob - ride ${jobId} already in terminal status ${ride.status}, skipping`,
        );
        return { success: true, message: 'Ride already ended' };
      }

      if ((ride.status as string) !== 'SEARCHING_DRIVER') {
        this.logger.warn(
          `Invalid state - cannot decline ride ${jobId} in status ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot decline ride in status ${ride.status}`,
        );
      }

      this.logger.debug(
        `Ride ${jobId} declined by ${riderId} - handled via Redis matching pipeline`,
      );

      return { success: true, message: 'Ride declined' };
    }

    this.logger.error(`declineJob - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider arrived at pickup location.
   */
  async arriveAtPickup(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    this.logger.debug(
      `arriveAtPickup - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
        include: { pickupAddress: true, dropoffAddress: true },
      });

      if (!delivery) {
        this.logger.warn(`arriveAtPickup - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - delivery ${jobId} belongs to ${delivery.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your delivery');
      }

      this.logger.debug(
        `Delivery rider arrived at pickup - ${jobId} (UI state only)`,
      );

      const stops = (delivery as any).stops as any[] | null;
      const currentStopIndex = (delivery as any).currentStopIndex ?? 0;
      const currentStop = stops?.[currentStopIndex] ?? null;

      return {
        id: delivery.id,
        status: delivery.status,
        pickupAddress: delivery.pickupAddress,
        stops,
        currentStopIndex,
        currentStop,
      };
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true, customerId: true },
      });

      if (!ride) {
        this.logger.warn(`arriveAtPickup - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - ride ${jobId} belongs to ${ride.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your ride');
      }

      // DRIVER_ACCEPTED or PAID: notify customer, no state change (ARRIVED removed)
      const validArrivalStatuses: string[] = ['DRIVER_ACCEPTED', 'PAID'];
      if (!validArrivalStatuses.includes(ride.status as string)) {
        this.logger.warn(
          `Invalid state - cannot notify arrival for ride ${jobId} in ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot notify arrival for ride in status ${ride.status}`,
        );
      }

      this.logger.debug(
        `Ride ${jobId} driver arrived at pickup (no state change)`,
      );

      // Notify customer that driver has arrived
      if (ride.customerId) {
        try {
          this.notificationsGateway.server
            .to(`user_${ride.customerId}`)
            .emit('DRIVER_ARRIVED', {
              type: 'DRIVER_ARRIVED',
              rideId: jobId,
              metadata: {
                message: 'Your driver has arrived at the pickup location.',
              },
            });
          this.logger.debug(
            `Emitted DRIVER_ARRIVED to customer user_${ride.customerId}`,
          );
        } catch (e) {
          this.logger.error('Socket emit DRIVER_ARRIVED failed', e);
        }
      }

      return { id: ride.id, status: ride.status };
    }

    this.logger.error(`arriveAtPickup - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider confirms pickup.
   */
  async confirmPickup(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
    otp?: string,
  ) {
    this.logger.debug(
      `confirmPickup - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) {
        this.logger.warn(`confirmPickup - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - delivery ${jobId} belongs to ${delivery.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your delivery');
      }

      if (delivery.status !== DeliveryStatus.ACCEPTED) {
        this.logger.warn(
          `Invalid state - cannot confirm pickup for delivery ${jobId} in ${delivery.status}`,
        );
        throw new BadRequestException(
          `Cannot confirm pickup in status ${delivery.status}`,
        );
      }

      const stops = (delivery as any).stops as any[] | null;
      const currentStopIndex = (delivery as any).currentStopIndex ?? 0;

      if (stops && stops.length > 1) {
        this.logger.debug(
          `Multi-stop delivery ${jobId} - confirming pickup at stop ${currentStopIndex + 1}/${stops.length}`,
        );

        const newStops = stops.map((s: any, i: number) =>
          i === currentStopIndex ? { ...s, status: 'PICKED_UP' } : s,
        );

        const nextIndex = currentStopIndex + 1;
        const allDone = nextIndex >= stops.length;

        if (allDone) {
          this.logger.debug(
            `Multi-stop delivery ${jobId} - all stops picked up → PICKED_UP`,
          );
          await this.prisma.delivery.update({
            where: { id: jobId },
            data: {
              stops: newStops,
              status: DeliveryStatus.PICKED_UP,
              pickedUpAt: new Date(),
            } as any,
          });
          return { nextStop: null, nextStopIndex: null, isComplete: true };
        } else {
          this.logger.debug(
            `Multi-stop delivery ${jobId} - advancing to stop ${nextIndex + 1}`,
          );
          const nextStop = stops[nextIndex];
          const nextPickupAddress = nextStop.pickupAddressId
            ? await this.prisma.address.findUnique({
                where: { id: nextStop.pickupAddressId },
              })
            : null;

          await this.prisma.delivery.update({
            where: { id: jobId },
            data: {
              stops: newStops,
              currentStopIndex: nextIndex,
            } as any,
          });

          return {
            nextStop: { ...nextStop, pickupAddress: nextPickupAddress },
            nextStopIndex: nextIndex,
            isComplete: false,
          };
        }
      }

      // Single-stop
      this.logger.debug(`Single-stop delivery ${jobId} → PICKED_UP`);
      await this.prisma.delivery.update({
        where: { id: jobId },
        data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
      });

      return { nextStop: null, nextStopIndex: null, isComplete: true };
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          status: true,
          riderId: true,
          startOtp: true,
          customerId: true,
        },
      });

      if (!ride) {
        this.logger.warn(`confirmPickup - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - ride ${jobId} belongs to ${ride.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your ride');
      }

      // Post-ride payment model: driver starts ride from DRIVER_ACCEPTED.
      // PAID is kept for backward compatibility with legacy pre-paid rides.
      const startableStatuses = ['DRIVER_ACCEPTED', 'PAID'];
      if (!startableStatuses.includes(ride.status as string)) {
        this.logger.warn(
          `Invalid state - cannot confirm pickup for ride ${jobId} in ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot start ride in status ${ride.status}`,
        );
      }

      // Verify OTP if one is stored for this ride
      if (ride.startOtp) {
        if (!otp || otp.trim() !== ride.startOtp.trim()) {
          this.logger.warn(`OTP mismatch for ride ${jobId} - provided: ${otp}`);
          throw new BadRequestException(
            'Invalid OTP. Ask the passenger to check the code on their screen.',
          );
        }
      }

      this.logger.debug(`Updating ride ${jobId} → IN_PROGRESS`);

      const startedRide = await this.prisma.ride.update({
        where: { id: jobId },
        data: { status: 'IN_PROGRESS' as any, startedAt: new Date() },
      });

      // Notify customer that the trip has started so the UI updates
      try {
        this.notificationsGateway.server
          .to(`user_${ride.customerId}`)
          .emit('TRIP_STARTED', { type: 'TRIP_STARTED', rideId: jobId });
        this.logger.debug(
          `Emitted TRIP_STARTED to customer user_${ride.customerId}`,
        );
      } catch (e) {
        this.logger.error('Socket emit TRIP_STARTED failed', e);
      }

      return startedRide;
    }

    this.logger.error(`confirmPickup - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider arrived at dropoff (mostly UI trigger).
   */
  async arriveAtDropoff(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
  ) {
    this.logger.debug(
      `arriveAtDropoff - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
        include: { dropoffAddress: true },
      });

      if (!delivery) {
        this.logger.warn(`arriveAtDropoff - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - delivery ${jobId} belongs to ${delivery.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your delivery');
      }

      this.logger.debug(
        `Delivery rider arrived at dropoff - ${jobId} (UI state)`,
      );

      return {
        id: delivery.id,
        status: delivery.status,
        dropoffAddress: delivery.dropoffAddress,
        requiresOtp: false,
      };
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true },
      });

      if (!ride) {
        this.logger.warn(`arriveAtDropoff - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - ride ${jobId} belongs to ${ride.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your ride');
      }

      this.logger.debug(
        `Ride ${jobId} rider arrived at dropoff (no status change)`,
      );

      return { id: ride.id, status: ride.status };
    }

    this.logger.error(`arriveAtDropoff - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Rider completes the job.
   */
  async completeJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
    payload?: any,
  ) {
    this.logger.debug(
      `completeJob - type=${jobType}, id=${jobId}, rider=${riderId}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          status: true,
          riderId: true,
          deliveryFee: true,
        },
      });

      if (!delivery) {
        this.logger.warn(`completeJob - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - delivery ${jobId} belongs to ${delivery.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your delivery');
      }

      if (delivery.status !== DeliveryStatus.PICKED_UP) {
        this.logger.warn(
          `Invalid state - cannot complete delivery ${jobId} in ${delivery.status}`,
        );
        throw new BadRequestException(
          `Cannot complete delivery in status ${delivery.status}`,
        );
      }

      this.logger.debug(`Completing delivery ${jobId} → DELIVERED`);

      const updatedDelivery = await this.prisma.delivery.update({
        where: { id: jobId },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      // Credit rider wallet with delivery earnings
      try {
        await this.transactionLedger.recordDeliveryEarnings({
          id: jobId,
          riderId: delivery.riderId!,
          deliveryFee: delivery.deliveryFee ?? 0,
        });
        this.logger.debug(
          `Delivery earnings credited - riderId=${delivery.riderId}, amount=${delivery.deliveryFee}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to credit delivery earnings for job ${jobId}: ${err?.message}`,
          err?.stack,
        );
      }

      return updatedDelivery;
    }

    if (jobType === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, riderId: true, customerId: true },
      });

      if (!ride) {
        this.logger.warn(`completeJob - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden - ride ${jobId} belongs to ${ride.riderId}, not ${riderId}`,
        );
        throw new ForbiddenException('Not your ride');
      }

      if (ride.status !== RideStatus.IN_PROGRESS) {
        this.logger.warn(
          `Invalid state - cannot complete ride ${jobId} in ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot complete ride in status ${ride.status}`,
        );
      }

      this.logger.debug(`Completing ride ${jobId} → COMPLETED`);

      const completedRide = await this.prisma.ride.update({
        where: { id: jobId },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
        } as any,
      });

      // Notify customer that the trip has been completed
      try {
        this.notificationsGateway.server
          .to(`user_${ride.customerId}`)
          .emit('TRIP_COMPLETED', { type: 'TRIP_COMPLETED', rideId: jobId });
        this.logger.debug(
          `Emitted TRIP_COMPLETED to customer user_${ride.customerId}`,
        );
      } catch (e) {
        this.logger.error('Socket emit TRIP_COMPLETED failed', e);
      }

      return completedRide;
    }

    this.logger.error(`completeJob - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }

  /**
   * Pre-verifies a delivery OTP before the rider calls completeJob.
   * Returns { valid: true } on match, throws BadRequestException on mismatch.
   */
  async verifyDeliveryOtp(riderId: string, jobId: string, otp: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: jobId },
      select: { id: true, riderId: true, deliveryOtp: true },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');
    if (delivery.riderId !== riderId)
      throw new ForbiddenException('Not your delivery');

    if (!delivery.deliveryOtp) {
      // No OTP required for this delivery — treat as valid
      return { valid: true, requiresOtp: false };
    }

    const isValid = otp.trim() === delivery.deliveryOtp.trim();
    if (!isValid) throw new BadRequestException('Incorrect delivery OTP.');

    return { valid: true, requiresOtp: true };
  }

  /**
   * Rider cancels an active job with reason.
   */
  async cancelJob(
    riderId: string,
    jobId: string,
    jobType: 'ride' | 'delivery',
    reason: string,
  ) {
    this.logger.debug(
      `cancelJob - type=${jobType}, id=${jobId}, rider=${riderId}, reason=${reason}`,
    );

    if (jobType === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: jobId },
      });

      if (!delivery) {
        this.logger.warn(`cancelJob - delivery not found: ${jobId}`);
        throw new NotFoundException('Delivery not found');
      }

      if (delivery.riderId !== riderId) {
        this.logger.warn(
          `Forbidden cancel - delivery ${jobId} belongs to ${delivery.riderId}`,
        );
        throw new ForbiddenException('You are not assigned to this delivery');
      }

      // Idempotency: already cancelled
      if (delivery.status === DeliveryStatus.CANCELLED) {
        this.logger.debug(
          `cancelJob idempotent — delivery ${jobId} already CANCELLED`,
        );
        return { message: 'Job cancelled' };
      }

      const cancellable: DeliveryStatus[] = [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.ACCEPTED,
        DeliveryStatus.PICKED_UP,
      ];

      if (!cancellable.includes(delivery.status)) {
        this.logger.warn(
          `Invalid state - cannot cancel delivery ${jobId} in ${delivery.status}`,
        );
        throw new BadRequestException(
          `Cannot cancel delivery in status ${delivery.status}`,
        );
      }

      this.logger.debug(`Cancelling delivery ${jobId} → CANCELLED`);

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
        select: { id: true, status: true, riderId: true, customerId: true },
      });

      if (!ride) {
        this.logger.warn(`cancelJob - ride not found: ${jobId}`);
        throw new NotFoundException('Ride not found');
      }

      if (ride.riderId !== riderId) {
        this.logger.warn(
          `Forbidden cancel - ride ${jobId} belongs to ${ride.riderId}`,
        );
        throw new ForbiddenException('You are not assigned to this ride');
      }

      // Idempotency: already cancelled
      const alreadyCancelledRide = [
        'CANCELLED_BY_DRIVER',
        'CANCELLED_BY_USER',
        'CANCELLED',
      ];
      if (alreadyCancelledRide.includes(ride.status as string)) {
        this.logger.debug(
          `cancelJob idempotent — ride ${jobId} already ${ride.status}`,
        );
        return { message: 'Job cancelled' };
      }

      const cancellable: string[] = [
        'DRIVER_ACCEPTED',
        'ACCEPTED', // legacy status (pre-fix admin assignments)
        'DRIVER_ASSIGNED', // admin manual assignment (new flow)
        'PAID',
        'IN_PROGRESS',
      ];

      if (!cancellable.includes(ride.status as string)) {
        this.logger.warn(
          `Invalid state - cannot cancel ride ${jobId} in ${ride.status}`,
        );
        throw new BadRequestException(
          `Cannot cancel ride in status ${ride.status}`,
        );
      }

      this.logger.debug(
        `Cancelling ride ${jobId} → CANCELLED_BY_DRIVER, reason: ${reason}`,
      );

      await this.prisma.ride.update({
        where: { id: jobId },
        data: {
          status: 'CANCELLED_BY_DRIVER' as any,
          cancellationReason: reason || 'Driver cancelled',
          cancelledBy: 'DRIVER', // consistent string enum — was incorrectly storing riderId UUID
          cancelledAt: new Date(),
          riderId: null,
        },
      });

      // Release driver's Redis state so they become available for new matching
      try {
        await this.driverStateService.releaseDriver(riderId, jobId);
      } catch (redisErr) {
        // Non-fatal — DB cancel succeeded
        this.logger.error(
          `[cancelJob/ride] Failed to release driver ${riderId} from Redis`,
          redisErr,
        );
      }

      // Notify the customer that their driver cancelled
      const cancelPayload = {
        type: 'RIDE_CANCELLED',
        rideId: jobId,
        cancelledBy: 'DRIVER',
        reason: reason || 'Driver cancelled the ride',
      };
      try {
        this.notificationsGateway.server
          .to(`user_${ride.customerId}`)
          .emit('RIDE_CANCELLED', cancelPayload);
        this.logger.log(
          `[cancelJob/ride] Emitted RIDE_CANCELLED to customer ${ride.customerId}`,
        );
      } catch (e) {
        this.logger.error('[cancelJob/ride] Socket emit failed', e);
      }

      // Emit event so rider-dispatch.listener can create a dispute if payment was made
      this.eventEmitter.emit('job.cancelled', {
        jobId,
        jobType: 'ride',
        cancelledBy: 'driver' as const,
        reason: reason || 'Driver cancelled',
        customerId: ride.customerId,
      });

      return { message: 'Ride cancelled' };
    }

    this.logger.error(`cancelJob - unknown jobType: ${jobType}`);
    throw new BadRequestException(`Unknown jobType: ${jobType}`);
  }
}
