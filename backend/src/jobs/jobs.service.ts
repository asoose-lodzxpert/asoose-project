import { Observable } from 'rxjs';

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  JobType,
  JobSummaryDto,
  rideToJobSummary,
  deliveryToJobSummary,
} from './job.dto';
import { RidersStreamService } from 'src/riders/riders-stream.service';
import { RideService } from 'src/ride/ride.service';
import { DeliveryService } from 'src/delivery/delivery.service';
import { RideStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(
    @Inject(forwardRef(() => RideService))
    private readonly rideService: RideService,
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveryService: DeliveryService,
    private readonly ridersStreamService: RidersStreamService,
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
      if (job)
        this.ridersStreamService.emitJobAssigned(
          userId,
          job.id,
          'RIDE',
          rideToJobSummary(job),
        );
    } else if (jobType === 'delivery') {
      job = await this.deliveryService.acceptDelivery(jobId, userId);
      if (job)
        this.ridersStreamService.emitJobAssigned(
          userId,
          job.id,
          'DELIVERY',
          deliveryToJobSummary(job),
        );
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
      if (job)
        this.ridersStreamService.emitJobUpdate(
          job.riderId,
          job.id,
          'RIDE',
          rideToJobSummary(job),
        );
    } else if (jobType === 'delivery') {
      job = await this.deliveryService.updateDeliveryStatus(jobId, status);
      if (job)
        this.ridersStreamService.emitJobUpdate(
          job.riderId,
          job.id,
          'DELIVERY',
          deliveryToJobSummary(job),
        );
    }
    return job;
  }

  async completeJob(jobId: string, jobType: JobType, payload: any) {
    let job;
    if (jobType === 'ride') {
      job = await this.rideService.completeRide(jobId, payload);
      if (job)
        this.ridersStreamService.emitJobUpdate(
          job.riderId,
          job.id,
          'RIDE',
          rideToJobSummary(job),
        );
    } else if (jobType === 'delivery') {
      job = await this.deliveryService.completeDelivery(jobId, payload);
      if (job)
        this.ridersStreamService.emitJobUpdate(
          job.riderId,
          job.id,
          'DELIVERY',
          deliveryToJobSummary(job),
        );
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

  streamJobs(userId: string): Observable<any> {
    return this.ridersStreamService.getRiderStream(userId);
  }
}
