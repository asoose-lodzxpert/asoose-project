import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';
import { JOB_EVENTS } from '../../matching/events/event-types';
import type {
  JobAssignedEvent,
  JobUpdatedEvent,
  JobCancelledEvent,
} from '../../matching/events/event-types';
import { PrismaService } from '../../prisma/prisma.service';
import { rideToJobSummary, deliveryToJobSummary } from '../../riders/jobs/job.dto';

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
  handleJobCancelled(payload: JobCancelledEvent) {
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
    }
  }
}
