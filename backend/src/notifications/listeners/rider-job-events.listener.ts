import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';
import { NotificationsService } from '../notifications.service';
import { JOB_EVENTS, NOTIFICATION_EVENTS } from '../../matching/events/event-types';
import type {
  JobAssignedEvent,
  JobUpdatedEvent,
  JobCancelledEvent,
  SendPushNotificationEvent,
} from '../../matching/events/event-types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  rideToJobSummary,
  deliveryToJobSummary,
} from '../../riders/jobs/job.dto';

/**
 * Listener for rider job events
 * Emits socket events to riders when jobs are assigned, updated, or cancelled
 */
@Injectable()
export class RiderJobEventsListener {
  private readonly logger = new Logger(RiderJobEventsListener.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent(JOB_EVENTS.ASSIGNED)
  async handleJobAssigned(payload: JobAssignedEvent) {
    const recipientId =
      payload.jobType === 'ride'
        ? payload.driverId
        : (payload as any).riderId || payload.driverId;

    if (!recipientId) {
      this.logger.warn(
        `job.assigned received without recipientId for job ${payload.jobId}`,
      );
      return;
    }

    this.logger.log(
      `Emitting job.assigned to ${recipientId} for ${payload.jobType} ${payload.jobId}`,
    );

    try {
      let jobData: any;

      if (payload.jobType === 'ride') {
        const ride = await this.prisma.ride.findUnique({
          where: { id: payload.jobId },
          include: {
            customer: { select: { name: true, phone: true } },
            pickupAddress: true,
            dropoffAddress: true,
          },
        });

        if (!ride) {
          this.logger.warn(`Ride ${payload.jobId} not found for job.assigned`);
          return;
        }

        const summary = rideToJobSummary(ride);
        jobData = {
          ...summary,
          expiresAt: payload.expiresAt,
          timestamp: payload.timestamp,
        };
      } else {
        const delivery = await this.prisma.delivery.findUnique({
          where: { id: payload.jobId },
          include: {
            customer: { select: { name: true, phone: true } },
            pickupAddress: true,
            dropoffAddress: true,
            order: {
              include: {
                store: {
                  include: { vendor: { select: { phone: true } } },
                },
                items: {
                  include: { product: true },
                },
              },
            },
          },
        });

        if (!delivery) {
          this.logger.warn(
            `Delivery ${payload.jobId} not found for job.assigned`,
          );
          return;
        }

        const summary = deliveryToJobSummary(delivery);
        jobData = {
          ...summary,
          expiresAt: payload.expiresAt,
          timestamp: payload.timestamp,
        };
      }

      this.gateway.server
        .to(`user_${recipientId}`)
        .emit('job.assigned', jobData);

      // ── NEW: Push Notification for Rider/Driver ──
      try {
        await this.notificationsService.createForRider({
          riderId: recipientId,
          title: payload.jobType === 'ride' ? '🛵 New Ride Ping!' : '📦 New Delivery Ping!',
          message: payload.jobType === 'ride' 
            ? 'A new ride is available nearby. Tap to view.' 
            : 'A new delivery is available. Tap to view.',
          type: payload.jobType === 'ride' ? 'RIDE' : 'DELIVERY',
          category: 'job',
          metadata: { jobId: payload.jobId, jobType: payload.jobType, type: 'JOB_ASSIGNED' },
        });
      } catch (err) {
        this.logger.error(`Failed to send push for job.assigned: ${err.message}`);
      }

      // Join rider/driver to the job room so they receive granular order_update events.
      // Uses adapter-aware socketsJoin — works across horizontally-scaled instances.
      await this.gateway.joinJobRoom(recipientId, payload.jobId);
    } catch (err) {
      this.logger.error(
        `Failed to fetch job data for job.assigned ${payload.jobId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent(JOB_EVENTS.UPDATED)
  handleJobUpdated(payload: JobUpdatedEvent) {
    const recipientId = payload.driverId || (payload as any).riderId;

    if (!recipientId) {
      this.logger.warn(`Job updated with no driver/rider ID: ${payload.jobId}`);
      return;
    }

    this.logger.log(
      `Emitting job.updated to ${recipientId}: ${payload.jobId} -> ${payload.status}`,
    );

    this.gateway.server.to(`user_${recipientId}`).emit('job.updated', {
      id: payload.jobId,
      jobType: payload.jobType,
      status: payload.status,
      metadata: payload.metadata,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent(JOB_EVENTS.CANCELLED)
  async handleJobCancelled(payload: JobCancelledEvent) {
    const recipientId = payload.driverId || (payload as any).riderId;

    if (!recipientId) {
      // No driver was assigned — this is a system cancellation (e.g. no driver found).
      // Notify the customer directly so their app can clear the ride state.
      if (payload.customerId) {
        this.logger.log(
          `No driver for ${payload.jobId} — notifying customer ${payload.customerId}`,
        );
        // NO_DRIVERS_FOUND → sets error message in customer app
        this.gateway.server
          .to(`user_${payload.customerId}`)
          .emit('NO_DRIVERS_FOUND', {
            type: 'NO_DRIVERS_FOUND',
            rideId: payload.jobId,
            reason: payload.reason || 'No drivers available',
            timestamp: payload.timestamp,
          });
        // RIDE_CANCELLED → clears ride state in customer app
        this.gateway.server
          .to(`user_${payload.customerId}`)
          .emit('RIDE_CANCELLED', {
            type: 'RIDE_CANCELLED',
            rideId: payload.jobId,
            reason: payload.reason || 'No drivers available',
            cancelledBy: payload.cancelledBy,
            timestamp: payload.timestamp,
          });
      } else {
        this.logger.warn(
          `Job cancelled with no driver/rider ID: ${payload.jobId}`,
        );
      }
      return;
    }

    this.logger.log(
      `Emitting job.cancelled to ${recipientId}: ${payload.jobId}`,
    );

    this.gateway.server.to(`user_${recipientId}`).emit('job.cancelled', {
      id: payload.jobId,
      jobType: payload.jobType,
      cancelledBy: payload.cancelledBy,
      reason: payload.reason,
      timestamp: payload.timestamp,
    });

    // ── NEW: Push Notification for Rider/Driver ──
    try {
      await this.notificationsService.createForRider({
        riderId: recipientId,
        title: '⚠️ Trip Cancelled',
        message: `The trip ${payload.jobId.slice(0, 8)} has been cancelled by ${payload.cancelledBy}.`,
        type: payload.jobType === 'ride' ? 'RIDE' : 'DELIVERY',
        metadata: { jobId: payload.jobId, type: 'JOB_CANCELLED', cancelledBy: payload.cancelledBy },
      });
    } catch (err) {
      this.logger.error(`Failed to send rider cancel push: ${err.message}`);
    }

    // If the system cancelled a job that had a driver AND we know the customer,
    // notify the customer too so their app clears the ride state.
    if (payload.cancelledBy === 'system' && payload.customerId) {
      this.logger.log(
        `System cancel with driver — also notifying customer ${payload.customerId} for ride ${payload.jobId}`,
      );
      this.gateway.server
        .to(`user_${payload.customerId}`)
        .emit('RIDE_CANCELLED', {
          type: 'RIDE_CANCELLED',
          rideId: payload.jobId,
          reason: payload.reason || 'Cancelled by system',
          cancelledBy: 'system',
          timestamp: payload.timestamp,
        });

      // ── NEW: Push Notification for Customer ──
      try {
        await this.notificationsService.create({
          userId: payload.customerId,
          title: '⚠️ Ride Cancelled',
          message: `Your ride was cancelled by the system. Reason: ${payload.reason || 'No drivers available'}.`,
          type: 'RIDE',
          metadata: { rideId: payload.jobId, type: 'RIDE_CANCELLED' },
        });
      } catch (err) {
        this.logger.error(`Failed to send system cancel push: ${err.message}`);
      }
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.SEND_PUSH)
  async handleSendPush(payload: SendPushNotificationEvent) {
    this.logger.log(`Handling internal push request: ${payload.title}`);
    const recipientId = payload.userId || payload.driverId;
    if (!recipientId) return;

    try {
      if (payload.driverId) {
        await this.notificationsService.createForRider({
          riderId: payload.driverId,
          title: payload.title,
          message: payload.body,
          type: (payload.data?.type as string) || 'SYSTEM',
          metadata: payload.data,
        });
      } else if (payload.userId) {
        await this.notificationsService.create({
          userId: payload.userId,
          title: payload.title,
          message: payload.body,
          type: (payload.data?.type as string) || 'SYSTEM',
          metadata: payload.data,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to dispatch internal push: ${err.message}`);
    }
  }
}
