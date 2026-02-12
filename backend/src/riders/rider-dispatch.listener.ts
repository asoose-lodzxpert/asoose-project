import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFacade } from '../users/notification.facade';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class RiderDispatchListener {
  private readonly logger = new Logger(RiderDispatchListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationFacade: NotificationFacade,
    private notificationsGateway: NotificationsGateway,
  ) {}

  @OnEvent('job.assigned')
  async handleJobAssignedEvent(payload: {
    id: string;
    jobType: 'RIDE' | 'DELIVERY';
  }) {
    this.logger.log(
      `Processing job.assigned event: ${payload.jobType} ${payload.id}`,
    );

    if (payload.jobType === 'DELIVERY') {
      await this.handleDeliveryAssignment(payload.id);
    } else if (payload.jobType === 'RIDE') {
      await this.handleRideAssignment(payload.id);
    }
  }

  private async handleDeliveryAssignment(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            store: true,
            items: { include: { product: true } },
          },
        },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery || !delivery.riderId || !delivery.orderId) {
      this.logger.warn(`Delivery ${deliveryId} missing rider or order`);
      return;
    }

    // Format data to match IncomingJobOffer interface
    const jobData = {
      id: delivery.id,
      jobType: 'delivery' as const,
      pickupAddress: delivery.pickupAddress,
      dropoffAddress: delivery.dropoffAddress,
      customerName: delivery.order?.store?.name || 'Store',
      earnings: delivery.deliveryFee || 0,
      estimatedEarnings: delivery.deliveryFee || 0,
      packageDetails: this.buildPackageDetails(delivery.order),
      distanceKm: delivery.distanceKm,
    };

    // Emit via WebSocket
    this.notificationsGateway.emitJobAssigned(delivery.riderId, jobData);

    // Join rider to order room for real-time updates
    this.notificationsGateway.joinJobRoom(delivery.riderId, delivery.orderId);

    // Send push notification
    await this.notificationFacade.notifyRider(
      delivery.riderId,
      'New Delivery Assigned',
      `Pick up order #${delivery.orderId.slice(0, 8)} at ${delivery.order?.store?.name || 'Store'}`,
      { deliveryId: delivery.id, type: 'DELIVERY_ASSIGNED' },
    );

    this.logger.log(
      `Delivery ${deliveryId} assigned to rider ${delivery.riderId}`,
    );
  }

  private async handleRideAssignment(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!ride || !ride.riderId) {
      this.logger.warn(`Ride ${rideId} missing rider assignment`);
      return;
    }

    // Format data to match IncomingJobOffer interface
    const jobData = {
      id: ride.id,
      jobType: 'ride' as const,
      pickupAddress: ride.pickupAddress,
      dropoffAddress: ride.dropoffAddress,
      customerName: ride.customer?.name || 'Customer',
      earnings: ride.totalFare || 0,
      estimatedEarnings: ride.totalFare || 0,
      distanceKm: ride.distanceKm,
      durationMin: ride.durationMin,
    };

    // Emit via WebSocket
    this.notificationsGateway.emitJobAssigned(ride.riderId, jobData);

    // Join rider to ride room for real-time updates
    this.notificationsGateway.joinJobRoom(ride.riderId, ride.id);

    // Send push notification
    await this.notificationFacade.notifyRider(
      ride.riderId,
      'New Ride Assigned',
      `New ride request from ${ride.customer?.name || 'Customer'}`,
      { rideId: ride.id, type: 'RIDE_ASSIGNED' },
    );

    this.logger.log(`Ride ${rideId} assigned to rider ${ride.riderId}`);
  }

  @OnEvent('job.updated')
  async handleJobUpdatedEvent(payload: {
    id: string;
    jobType: 'RIDE' | 'DELIVERY';
    status: string;
  }) {
    this.logger.log(
      `Processing job.updated event: ${payload.jobType} ${payload.id} -> ${payload.status}`,
    );

    if (payload.jobType === 'DELIVERY') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: payload.id },
        include: {
          order: {
            include: {
              store: true,
            },
          },
          pickupAddress: true,
          dropoffAddress: true,
        },
      });

      if (delivery && delivery.riderId) {
        const jobData = {
          id: delivery.id,
          status: delivery.status,
          jobType: 'delivery' as const,
        };

        this.notificationsGateway.emitJobUpdated(delivery.riderId, jobData);
        this.logger.log(
          `Delivery ${payload.id} update sent to rider ${delivery.riderId}`,
        );
      }
    } else if (payload.jobType === 'RIDE') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.id },
        include: {
          customer: true,
          pickupAddress: true,
          dropoffAddress: true,
        },
      });

      if (ride && ride.riderId) {
        const jobData = {
          id: ride.id,
          status: ride.status,
          jobType: 'ride' as const,
        };

        this.notificationsGateway.emitJobUpdated(ride.riderId, jobData);
        this.logger.log(
          `Ride ${payload.id} update sent to rider ${ride.riderId}`,
        );
      }
    }
  }

  @OnEvent('job.cancelled')
  async handleJobCancelledEvent(payload: {
    id: string;
    jobType: 'RIDE' | 'DELIVERY';
    reason?: string;
  }) {
    this.logger.log(
      `Processing job.cancelled event: ${payload.jobType} ${payload.id}`,
    );

    if (payload.jobType === 'DELIVERY') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: payload.id },
        select: { riderId: true, id: true },
      });

      if (delivery && delivery.riderId) {
        const jobData = {
          id: delivery.id,
          reason: payload.reason || 'Cancelled by customer',
        };

        this.notificationsGateway.emitJobCancelled(delivery.riderId, jobData);
        this.logger.log(
          `Delivery ${payload.id} cancellation sent to rider ${delivery.riderId}`,
        );
      }
    } else if (payload.jobType === 'RIDE') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.id },
        select: { riderId: true, id: true },
      });

      if (ride && ride.riderId) {
        const jobData = {
          id: ride.id,
          reason: payload.reason || 'Cancelled by customer',
        };

        this.notificationsGateway.emitJobCancelled(ride.riderId, jobData);
        this.logger.log(
          `Ride ${payload.id} cancellation sent to rider ${ride.riderId}`,
        );
      }
    }
  }

  private buildPackageDetails(order: any): string {
    if (!order?.items || order.items.length === 0) {
      return 'Package';
    }

    const itemCount = order.items.length;
    const firstItem = order.items[0]?.product?.name || 'items';

    if (itemCount === 1) {
      return firstItem;
    }

    return `${firstItem} and ${itemCount - 1} more item${itemCount > 2 ? 's' : ''}`;
  }
}
