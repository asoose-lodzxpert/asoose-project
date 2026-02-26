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
  async handleJobAssignedEvent(payload: { jobId: string; jobType: string }) {
    this.logger.log(
      `Processing job.assigned event: ${payload.jobType} ${payload.jobId}`,
    );

    const type = payload.jobType?.toLowerCase();
    if (type === 'delivery') {
      await this.handleDeliveryAssignment(payload.jobId);
    } else if (type === 'ride') {
      await this.handleRideAssignment(payload.jobId);
    }
  }

  private async handleDeliveryAssignment(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            store: { include: { vendor: true } },
            items: { include: { product: true } },
          },
        },
        customer: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery || !delivery.riderId) {
      this.logger.warn(`Delivery ${deliveryId} missing rider assignment`);
      return;
    }

    const stops = (delivery as any).stops as any[] | null;
    const isMultiStop = stops && stops.length > 1;
    const isDirectDelivery = !delivery.orderId;

    // Build order items list (what the rider is picking up)
    const orderItems: string[] = (delivery.order?.items ?? []).map(
      (i: any) => i.product?.name || 'Item',
    );

    // Format data to match IncomingJobOffer interface
    const jobData = {
      id: delivery.id,
      jobType: 'delivery' as const,
      pickupAddress: delivery.pickupAddress,
      dropoffAddress: delivery.dropoffAddress,
      // Direct delivery: sender name; marketplace: store name
      customerName: isMultiStop
        ? `${stops!.length} Stores`
        : delivery.order?.store?.name ||
          (delivery as any).customer?.name ||
          'Sender',
      earnings: delivery.deliveryFee || 0,
      estimatedEarnings: delivery.deliveryFee || 0,
      packageDetails: isDirectDelivery
        ? ((delivery as any).packageDetails ?? undefined)
        : this.buildPackageDetails(delivery.order),
      distanceKm: delivery.distanceKm,
      // Contact phones:
      //   - Pickup: address phone → vendor phone → customer phone (sender)
      //   - Dropoff: recipientPhone
      pickupContactPhone:
        delivery.pickupAddress?.phone ||
        (delivery.order as any)?.store?.vendor?.phone ||
        (delivery as any).customer?.phone ||
        null,
      dropoffContactPhone: (delivery as any).recipientPhone || null,
      recipientName: (delivery as any).recipientName || null,
      // Order items (what's being picked up)
      orderItems,
      // Package handling flags
      isFragile: (delivery as any).isFragile ?? false,
      isPerishable: (delivery as any).isPerishable ?? false,
      containsLiquid: (delivery as any).containsLiquid ?? false,
      weightKg: (delivery as any).weightKg ?? null,
      // Multi-stop fields
      stops: stops ?? null,
      storeCount: stops?.length ?? 1,
      currentStopIndex: (delivery as any).currentStopIndex ?? 0,
      // Signal to the rider app whether an OTP must be collected at dropoff
      requiresOtp: !!(delivery as any).deliveryOtp,
    };

    // NOTE: Socket emission is handled by RiderJobEventsListener to avoid duplicate events.
    // Join rider to job room for real-time updates (use delivery.id for direct deliveries)
    const roomId = delivery.orderId ?? delivery.id;
    this.notificationsGateway.joinJobRoom(delivery.riderId, roomId);

    // Send push notification
    const pickupName =
      delivery.order?.store?.name ||
      (delivery as any).customer?.name ||
      'Sender';
    const shortRef = (delivery.orderId ?? delivery.id).slice(0, 8);
    await this.notificationFacade.notifyRider(
      delivery.riderId,
      'New Delivery Assigned',
      `Pick up ${isDirectDelivery ? 'package' : `order #${shortRef}`} at ${pickupName}`,
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
      // During auto-matching, riderId is stored in Redis (pending lock) but
      // NOT yet in the DB. The RiderJobEventsListener handles that path.
      // Only warn if the ride itself doesn't exist.
      if (!ride) {
        this.logger.warn(`Ride ${rideId} not found in handleRideAssignment`);
      } else {
        this.logger.debug(
          `Ride ${rideId} has no riderId yet (auto-match pending) — skipping RiderDispatchListener`,
        );
      }
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
      // Contact phone (same person for both pickup and dropoff)
      pickupContactPhone: ride.customer?.phone || null,
      dropoffContactPhone: ride.customer?.phone || null,
    };

    // NOTE: Socket emission is handled by RiderJobEventsListener to avoid duplicate events.
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
    jobId: string;
    jobType: string;
    status: string;
  }) {
    this.logger.log(
      `Processing job.updated event: ${payload.jobType} ${payload.jobId} -> ${payload.status}`,
    );

    const type = payload.jobType?.toLowerCase();
    if (type === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: payload.jobId },
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
          `Delivery ${payload.jobId} update sent to rider ${delivery.riderId}`,
        );
      }
    } else if (type === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.jobId },
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
          `Ride ${payload.jobId} update sent to rider ${ride.riderId}`,
        );
      }
    }
  }

  @OnEvent('job.cancelled')
  async handleJobCancelledEvent(payload: {
    jobId: string;
    jobType: string;
    cancelledBy?: 'customer' | 'driver' | 'system';
    reason?: string;
    customerId?: string;
  }) {
    this.logger.log(
      `Processing job.cancelled event: ${payload.jobType} ${payload.jobId}`,
    );

    const type = payload.jobType?.toLowerCase();
    if (type === 'delivery') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: payload.jobId },
        select: {
          riderId: true,
          id: true,
          customerId: true,
          payment: { select: { status: true } },
        },
      });

      if (delivery) {
        if (delivery.riderId) {
          const jobData = {
            id: delivery.id,
            reason: payload.reason || 'Cancelled',
          };
          this.notificationsGateway.emitJobCancelled(delivery.riderId, jobData);
          this.logger.log(
            `Delivery ${payload.jobId} cancellation sent to rider ${delivery.riderId}`,
          );
        }

        // Only create a dispute if the customer actually paid — no payment, no refund needed.
        const deliveryWasPaid =
          delivery.payment !== null && delivery.payment?.status !== 'PENDING';
        if (deliveryWasPaid) {
          await this.createCancellationDispute(
            'delivery',
            delivery.id,
            delivery.customerId,
            payload.cancelledBy,
            payload.reason,
          );
        } else {
          this.logger.log(
            `Delivery ${delivery.id} cancelled with no payment — skipping dispute creation`,
          );
        }
      }
    } else if (type === 'ride') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.jobId },
        select: {
          riderId: true,
          id: true,
          customerId: true,
          payment: { select: { status: true } },
        },
      });

      if (ride) {
        if (ride.riderId) {
          const jobData = {
            id: ride.id,
            reason: payload.reason || 'Cancelled',
          };
          this.notificationsGateway.emitJobCancelled(ride.riderId, jobData);
          this.logger.log(
            `Ride ${payload.jobId} cancellation sent to rider ${ride.riderId}`,
          );
        }

        // Only create a dispute if the customer actually paid — no payment, no refund needed.
        const rideWasPaid =
          ride.payment !== null && ride.payment?.status !== 'PENDING';
        if (rideWasPaid) {
          await this.createCancellationDispute(
            'ride',
            ride.id,
            ride.customerId,
            payload.cancelledBy,
            payload.reason,
          );
        } else {
          this.logger.log(
            `Ride ${ride.id} cancelled with no payment — skipping dispute creation`,
          );
        }
      }
    }
  }

  /**
   * Creates a dispute record when a job is cancelled so the admin
   * can review and issue a refund to the customer if applicable.
   * Idempotent — skips creation if a dispute already exists for this job.
   */
  private async createCancellationDispute(
    jobType: 'ride' | 'delivery',
    jobId: string,
    customerId: string,
    cancelledBy?: string,
    reason?: string,
  ): Promise<void> {
    try {
      // Guard: skip if a dispute already exists for this job
      const existing = await this.prisma.dispute.findFirst({
        where:
          jobType === 'delivery' ? { deliveryId: jobId } : { rideId: jobId },
        select: { id: true },
      });
      if (existing) {
        this.logger.log(
          `Dispute already exists for ${jobType} ${jobId} — skipping`,
        );
        return;
      }

      const cancelSource = cancelledBy ?? 'system';
      const description = [
        `This ${jobType} was cancelled and may require a refund.`,
        `Cancelled by: ${cancelSource}`,
        reason ? `Reason: ${reason}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await this.prisma.dispute.create({
        data: {
          openedByUserId: customerId,
          ...(jobType === 'delivery'
            ? { deliveryId: jobId }
            : { rideId: jobId }),
          reason: `${jobType === 'delivery' ? 'Delivery' : 'Ride'} cancelled – refund required`,
          description,
          priority: 'HIGH',
        },
      });

      this.logger.log(
        `Cancellation dispute created for ${jobType} ${jobId} (customer ${customerId})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to create cancellation dispute for ${jobType} ${jobId}`,
        err,
      );
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
