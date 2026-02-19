import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';
import { JOB_EVENTS } from '../../matching/events/event-types';
import type {
  JobAssignedEvent,
  JobUpdatedEvent,
  JobCancelledEvent,
} from '../../matching/events/event-types';

/**
 * Listener for rider job events
 * Emits socket events to riders when jobs are assigned, updated, or cancelled
 */
@Injectable()
export class RiderJobEventsListener {
  private readonly logger = new Logger(RiderJobEventsListener.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  @OnEvent(JOB_EVENTS.ASSIGNED)
  handleJobAssigned(payload: JobAssignedEvent) {
    // Only emit for ride jobs (drivers handle rides)
    if (payload.jobType === 'ride') {
      this.logger.log(`Emitting job.assigned for driver ${payload.driverId}`);

      this.gateway.server.to(`user_${payload.driverId}`).emit('job.assigned', {
        id: payload.jobId,
        jobType: payload.jobType,
        customerId: payload.customerId,
        expiresAt: payload.expiresAt,
        timestamp: payload.timestamp,
      });
    }
    // For deliveries, the job is assigned to a rider
    else if (payload.jobType === 'delivery') {
      // Note: In the current architecture, deliveries don't use JobAssignedEvent
      // They go through rider-state.service acceptJob which emits job.updated
      // But we'll handle it here for consistency
      const riderId = (payload as any).riderId || (payload as any).driverId;
      if (riderId) {
        this.logger.log(`Emitting job.assigned for rider ${riderId}`);

        this.gateway.server.to(`user_${riderId}`).emit('job.assigned', {
          id: payload.jobId,
          jobType: payload.jobType,
          customerId: payload.customerId,
          expiresAt: payload.expiresAt,
          timestamp: payload.timestamp,
        });
      }
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
  }
}
