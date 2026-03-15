import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class RiderDispatchListener {
  private readonly logger = new Logger(RiderDispatchListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  @OnEvent('job.assigned')
  async handleJobAssignedEvent(payload: {
    jobId: string;
    jobType: string;
    driverId?: string;
    riderId?: string;
  }) {
    this.logger.log(
      `Processing job.assigned event: ${payload.jobType} ${payload.jobId}`,
    );

    const fallbackRiderId = payload.driverId || payload.riderId;
    const type = payload.jobType?.toLowerCase();

    if (type === 'delivery') {
      await this.handleDeliveryAssignment(payload.jobId);
    } else if (type === 'ride') {
      await this.handleRideAssignment(payload.jobId, fallbackRiderId);
    }
  }

  private async handleDeliveryAssignment(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: { include: { store: { include: { vendor: true } } } },
        customer: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery || !delivery.riderId) {
      this.logger.warn(`Delivery ${deliveryId} missing rider assignment`);
      return;
    }

    // Join rider to job room for real-time socket updates
    const roomId = delivery.orderId ?? delivery.id;
    this.notificationsGateway.joinJobRoom(delivery.riderId, roomId);

    const pickupName =
      delivery.order?.store?.name ||
      (delivery as any).customer?.name ||
      'Sender';
    const shortRef = (delivery.orderId ?? delivery.id).slice(0, 8);

    await this.notificationsService.createForRider({
      riderId: delivery.riderId,
      title: 'New Delivery Assigned',
      message: `Pick up ${delivery.orderId ? `order #${shortRef}` : 'package'} at ${pickupName}`,
      type: 'DELIVERY',
      category: 'job', // CRITICAL: Matches setupNotificationCategories in rider app
      metadata: {
        jobId: delivery.id,
        jobType: 'delivery',
        // Ensure keys match what NotificationContext.tsx expects
        type: 'DELIVERY_ASSIGNED',
        earnings: String(delivery.deliveryFee || 0),
        pickupName,
      },
    });

    this.logger.log(
      `Delivery ${deliveryId} assigned to rider ${delivery.riderId}`,
    );
  }

  private async handleRideAssignment(rideId: string, fallbackRiderId?: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { customer: true },
    });

    if (!ride) return;

    const riderId = ride.riderId || fallbackRiderId;
    if (!riderId) return;

    this.notificationsGateway.joinJobRoom(riderId, ride.id);

    await this.notificationsService.createForRider({
      riderId,
      title: 'New Ride Assigned',
      message: `New ride request from ${ride.customer?.name || 'Customer'}`,
      type: 'RIDE',
      category: 'job', // CRITICAL: Matches setupNotificationCategories in rider app
      metadata: {
        jobId: ride.id,
        jobType: 'ride',
        type: 'RIDE_ASSIGNED',
        earnings: String(ride.totalFare || 0),
        customerName: ride.customer?.name || 'Customer',
      },
    });

    this.logger.log(`Ride ${rideId} assigned to rider ${riderId}`);
  }

  @OnEvent('job.updated')
  async handleJobUpdatedEvent(payload: {
    jobId: string;
    jobType: string;
    status: string;
  }) {
    const type = payload.jobType?.toLowerCase();
    const job =
      type === 'delivery'
        ? await this.prisma.delivery.findUnique({
            where: { id: payload.jobId },
            select: { riderId: true, status: true },
          })
        : await this.prisma.ride.findUnique({
            where: { id: payload.jobId },
            select: { riderId: true, status: true },
          });

    if (job?.riderId) {
      this.notificationsGateway.emitJobUpdated(job.riderId, {
        id: payload.jobId,
        status: job.status,
        jobType: type as any,
      });
    }
  }

  @OnEvent('job.cancelled')
  async handleJobCancelledEvent(payload: {
    jobId: string;
    jobType: string;
    reason?: string;
    customerId?: string;
    cancelledBy?: string;
  }) {
    const type = payload.jobType?.toLowerCase();
    const job =
      type === 'delivery'
        ? await this.prisma.delivery.findUnique({
            where: { id: payload.jobId },
            select: { riderId: true, customerId: true, payment: true },
          })
        : await this.prisma.ride.findUnique({
            where: { id: payload.jobId },
            select: { riderId: true, customerId: true, payment: true },
          });

    if (!job) return;

    if (job.riderId) {
      this.notificationsGateway.emitJobCancelled(job.riderId, {
        id: payload.jobId,
        reason: payload.reason || 'Cancelled',
      });
    }

    // Auto-create dispute if payment was already processed
    const wasPaid =
      (job as any).payment && (job as any).payment.status !== 'PENDING';
    if (wasPaid) {
      await this.createCancellationDispute(
        type as any,
        payload.jobId,
        job.customerId,
        payload.cancelledBy,
        payload.reason,
      );
    }
  }

  private async createCancellationDispute(
    jobType: 'ride' | 'delivery',
    jobId: string,
    customerId: string,
    cancelledBy?: string,
    reason?: string,
  ) {
    const existing = await this.prisma.dispute.findFirst({
      where: jobType === 'delivery' ? { deliveryId: jobId } : { rideId: jobId },
    });
    if (existing) return;

    await this.prisma.dispute.create({
      data: {
        openedByUserId: customerId,
        ...(jobType === 'delivery' ? { deliveryId: jobId } : { rideId: jobId }),
        reason: `${jobType === 'delivery' ? 'Delivery' : 'Ride'} cancelled – refund required`,
        description: `Cancelled by: ${cancelledBy ?? 'system'}\nReason: ${reason ?? 'No reason provided'}`,
        priority: 'HIGH',
      },
    });
  }
}
