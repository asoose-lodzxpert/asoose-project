import { Observable } from 'rxjs';

import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import {
  JobType,
  JobSummaryDto,
  rideToJobSummary,
  deliveryToJobSummary,
} from './job.dto';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { DeliveriesService } from 'src/users/trips/deliveries.service';
import { RideStatus } from '@prisma/client';
import { RidesService } from 'src/users/trips/rides.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @Inject(forwardRef(() => RidesService))
    private readonly rideService: RidesService,
    @Inject(forwardRef(() => DeliveriesService))
    private readonly deliveryService: DeliveriesService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async findActiveJobForUser(
    userId: string,
    role: string,
  ): Promise<JobSummaryDto | null> {
    if (role === 'DRIVER') {
      const ride = await this.rideService.findActiveRideForDriver(userId);
      return ride ? rideToJobSummary(ride) : null;
    } else if (role === 'RIDER') {
      const delivery =
        await this.deliveryService.findActiveDeliveryForRider(userId);
      return delivery ? deliveryToJobSummary(delivery) : null;
    }
    return null;
  }

  async findIncomingJobsForUser(
    userId: string,
    role: string,
  ): Promise<JobSummaryDto[]> {
    if (role === 'DRIVER') {
      const rides = await this.rideService.findIncomingRidesForDriver(userId);
      return rides.map(rideToJobSummary);
    } else if (role === 'RIDER') {
      const deliveries =
        await this.deliveryService.findIncomingDeliveriesForRider(userId);
      return deliveries.map(deliveryToJobSummary);
    }
    return [];
  }

  async acceptJob(jobId: string, jobType: JobType, userId: string) {
    let job;
    if (jobType === 'ride') {
      job = await this.rideService.acceptRide(jobId, userId);
      if (job) {
        this.notificationsGateway.emitJobAssigned(
          userId,
          rideToJobSummary(job),
        );
      }
    } else if (jobType === 'delivery') {
      job = await this.deliveryService.acceptDelivery(jobId, userId);
      if (job) {
        this.notificationsGateway.emitJobAssigned(
          userId,
          deliveryToJobSummary(job),
        );
      }
    }
    return job;
  }

  async updateJobStatus(jobId: string, jobType: JobType, status: string) {
    let job;
    if (jobType === 'ride') {
      job = await this.rideService.updateRideStatus(
        jobId,
        status as RideStatus,
      );
      if (job) {
        this.notificationsGateway.emitJobUpdated(
          job.riderId,
          rideToJobSummary(job),
        );
      }
    } else if (jobType === 'delivery') {
      job = await this.deliveryService.updateDeliveryStatus(jobId, status);
      if (job) {
        this.notificationsGateway.emitJobUpdated(
          job.riderId,
          deliveryToJobSummary(job),
        );
      }
    }
    return job;
  }

  async completeJob(jobId: string, jobType: JobType, payload: any) {
    let job;
    if (jobType === 'ride') {
      job = await this.rideService.completeRide(jobId, payload, 14.11, 23.32);
      if (job) {
        this.notificationsGateway.emitJobUpdated(
          job.riderId,
          rideToJobSummary(job),
        );
      }
    } else if (jobType === 'delivery') {
      // Expecting payload to have: riderId, otp, proof, lat, lng
      const { riderId, otp, proof, lat, lng } = payload;
      job = await this.deliveryService.completeDelivery(
        jobId,
        riderId,
        otp,
        proof,
        lat,
        lng,
      );
      if (job) {
        this.notificationsGateway.emitJobUpdated(
          job.riderId,
          deliveryToJobSummary(job),
        );
      }
    }
    return job;
  }

  async declineJob(jobId: string, jobType: JobType, userId: string) {
    if (jobType === 'ride') {
      return await this.rideService.declineRide(jobId, userId);
    } else if (jobType === 'delivery') {
      return await this.deliveryService.declineDelivery(jobId, userId);
    }
    return { success: false };
  }

  async arrivePickup(jobId: string, jobType: JobType, userId: string) {
    if (jobType === 'ride') {
      return await this.rideService.arrivePickup(jobId, userId);
    } else if (jobType === 'delivery') {
      return await this.deliveryService.arrivePickup(jobId, userId);
    }
    return { success: false };
  }

  async confirmPickup(jobId: string, jobType: JobType, userId: string) {
    if (jobType === 'ride') {
      return await this.rideService.confirmPickup(jobId, userId);
    } else if (jobType === 'delivery') {
      return await this.deliveryService.confirmPickup(jobId, userId);
    }
    return { success: false };
  }

  async arriveDropoff(jobId: string, jobType: JobType, userId: string) {
    if (jobType === 'ride') {
      return await this.rideService.arriveDropoff(jobId, userId);
    } else if (jobType === 'delivery') {
      return await this.deliveryService.arriveDropoff(jobId, userId);
    }
    return { success: false };
  }

  // SSE stream method removed - riders now use WebSocket (NotificationsGateway)
  // Events are emitted directly via socket to user_${riderId} rooms
}
