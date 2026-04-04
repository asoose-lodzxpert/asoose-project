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
        rider: true,
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
      title: '📦 New Delivery Job!',
      message: `Pick up from ${pickupName}. Tap to see details.`,
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

    // Admin Notification
    const riderName = (delivery as any).rider?.name || 'A rider';
    const customerName = delivery.customer?.name || 'Customer';
    await this.notificationsService.createForAdmin({
      title: '📦 Delivery Assigned',
      message: `${riderName} assigned to delivery ${shortRef} for ${customerName}.`,
      type: 'DELIVERY',
      metadata: { deliveryId, riderId: delivery.riderId, riderName, customerName },
    });
  }

  private async handleRideAssignment(rideId: string, fallbackRiderId?: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { customer: true, rider: true },
    });

    if (!ride) return;

    const riderId = ride.riderId || fallbackRiderId;
    if (!riderId) return;

    this.notificationsGateway.joinJobRoom(riderId, ride.id);

    await this.notificationsService.createForRider({
      riderId,
      title: '🛵 New Ride Request!',
      message: `${ride.customer?.name || 'A customer'} is waiting for a ride.`,
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

    // Admin Notification
    const riderName = ride.rider?.name || 'A rider';
    const customerName = ride.customer?.name || 'Customer';
    await this.notificationsService.createForAdmin({
      title: '🛵 Ride Assigned',
      message: `${riderName} assigned to ride ${rideId.slice(0, 8)} for ${customerName}.`,
      type: 'RIDE',
      metadata: { rideId, riderId, riderName, customerName },
    });
  }

  @OnEvent('job.updated')
  async handleJobUpdatedEvent(payload: {
    jobId: string;
    jobType: string;
    status: string;
  }) {
    const type = payload.jobType?.toLowerCase();
    const isDelivery = type === 'delivery';

    // Fetch full job details including rider info for better notification messages
    const job = isDelivery
      ? await this.prisma.delivery.findUnique({
          where: { id: payload.jobId },
          include: { rider: true, order: true },
        })
      : await this.prisma.ride.findUnique({
          where: { id: payload.jobId },
          include: { rider: true, customer: true },
        });

    if (!job || !job.riderId) return;

    // 1. Send real-time socket update to rider mobile app
    this.notificationsGateway.emitJobUpdated(job.riderId, {
      id: payload.jobId,
      status: job.status,
      jobType: type as any,
    });

    // 2. Prepare readable status message
    const readableStatus = job.status.replace(/_/g, ' ').toLowerCase();
    const jobLabel = isDelivery ? 'Delivery' : 'Ride';
    const riderName = (job as any).rider?.name || 'A rider';
    const title = `🚩 ${jobLabel} Update`;
    const message = `Job ${jobLabel === 'Delivery' ? (job as any).order?.id?.slice(0, 8) ?? payload.jobId : payload.jobId.slice(0, 8)} status: ${readableStatus}`;

    // 3. Create persistent notification for Rider (In-App History)
    await this.notificationsService.createForRider({
      riderId: job.riderId,
      title,
      message: `Your active ${jobLabel.toLowerCase()} is now: ${readableStatus.toUpperCase()}`,
      type: jobLabel.toUpperCase(),
      category: 'job',
      metadata: { jobId: payload.jobId, jobType: type, status: job.status },
    });

    // 4. Create readable alert for Admins
    await this.notificationsService.createForAdmin({
      title: `${jobLabel} ${readableStatus.toUpperCase()}`,
      message: `${riderName} updated ${jobLabel} ${payload.jobId.slice(0, 8)} to ${readableStatus}.`,
      type: jobLabel.toUpperCase(),
      metadata: { jobId: payload.jobId, jobType: type, status: job.status, riderName },
    });
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
    const isDelivery = type === 'delivery';

    const job = isDelivery
      ? await this.prisma.delivery.findUnique({
          where: { id: payload.jobId },
          include: { payment: true, rider: true },
        })
      : await this.prisma.ride.findUnique({
          where: { id: payload.jobId },
          include: { payment: true, rider: true },
        });

    if (!job) return;

    const jobLabel = isDelivery ? 'Delivery' : 'Ride';

    // 1. WebSocket update for rider (mobile app UI update)
    if (job.riderId) {
      this.notificationsGateway.emitJobCancelled(job.riderId, {
        id: payload.jobId,
        reason: payload.reason || 'Cancelled',
      });

      // 2. Create persistent notification for Rider (In-App History)
      await this.notificationsService.createForRider({
        riderId: job.riderId,
        title: `⚠️ ${jobLabel} Cancelled`,
        message: `Your active ${jobLabel.toLowerCase()} was cancelled. Reason: ${payload.reason || 'No reason provided'}`,
        type: jobLabel.toUpperCase(),
        metadata: { jobId: payload.jobId, reason: payload.reason },
      });
    }

    // 3. Create readable alert for Admins
    const actor = payload.cancelledBy || 'System';
    await this.notificationsService.createForAdmin({
      title: `🚫 ${jobLabel} Cancelled`,
      message: `${jobLabel} ${payload.jobId.slice(0, 8)} was cancelled by ${actor}. Reason: ${payload.reason || 'N/A'}`,
      type: jobLabel.toUpperCase(),
      metadata: {
        jobId: payload.jobId,
        jobType: type,
        cancelledBy: actor,
        reason: payload.reason,
      },
    });

    // 4. Auto-create dispute if payment was already processed
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
