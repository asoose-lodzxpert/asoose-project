import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  HandleAssignmentTimeoutJobData,
} from '../queue/queue.constants';
import { DriverStateService } from '../driver-state/driver-state.service';
import { QueueService } from '../queue/queue.service';
// Removed TripType import; job type is now in JobSummaryDto
import {
  MatchRideJobData,
  MatchDeliveryJobData,
} from '../queue/queue.constants';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Assignment Timeout Handler
 *
 * Handles driver assignment timeouts after 90 seconds.
 * If driver hasn't accepted/declined, auto-decline and retry matching.
 */
@Processor(QUEUE_NAMES.ASSIGNMENT_TIMEOUT, {
  concurrency: 5,
})
export class AssignmentTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(AssignmentTimeoutProcessor.name);

  constructor(
    private readonly driverState: DriverStateService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<HandleAssignmentTimeoutJobData>): Promise<void> {
    const { job: jobSummary } = job.data;
    const jobType = jobSummary.jobType;
    const jobId = jobSummary.id;

    this.logger.log(`Handling assignment timeout: ${jobType} ${jobId}`);

    try {
      // We need driverId for handleAssignmentTimeout. This should come from the matching context, but JobSummaryDto does not have driverId.
      // If the job was assigned, the driverId should be in the DB (ride or delivery entity). For timeout, we need to know which driver was assigned and timed out.
      // For now, skip calling handleAssignmentTimeout if driverId is not available, and log a warning.
      let driverId: string | undefined = undefined;
      if (jobType === 'ride') {
        const ride = await this.prisma.ride.findUnique({
          where: { id: jobId },
        });
        driverId = ride?.riderId ?? undefined;
        if (!driverId) {
          this.logger.warn(
            `No riderId found for ride ${jobId}, skipping assignment timeout handling.`,
          );
        } else {
          await this.driverState.handleAssignmentTimeout(driverId, {
            jobId,
            jobType: 'ride',
          });
        }
      } else if (jobType === 'delivery') {
        const delivery = await this.prisma.delivery.findUnique({
          where: { id: jobId },
        });
        driverId = delivery?.riderId ?? undefined;
        // DriverStateService only supports ride jobs, so skip for delivery

        this.logger.warn(
          `Assignment timeout for delivery ${jobId} (riderId: ${driverId}) not handled in DriverStateService.`,
        );
      }

      // Re-enqueue matching job to find another driver
      if (jobType === 'ride') {
        await this.retryRideMatching(jobSummary);
      } else {
        await this.retryDeliveryMatching(jobSummary);
      }
    } catch (error) {
      this.logger.error(
        `Error handling timeout for ${jobType} ${jobId}:`,
        error,
      );
      // Don't throw - timeout already occurred
    }
  }

  private async retryRideMatching(jobSummary: any): Promise<void> {
    // Get ride details
    const ride = await this.prisma.ride.findUnique({
      where: { id: jobSummary.id },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!ride) {
      this.logger.error(`Ride ${jobSummary.id} not found`);
      return;
    }

    if (ride.status !== 'REQUESTED') {
      this.logger.log(
        `Ride ${jobSummary.id} no longer REQUESTED, skipping retry`,
      );
      return;
    }

    // Re-enqueue with incremented attempt and exclude timed-out driver
    await this.queue.enqueueRideMatching({
      job: jobSummary,
      attempt: 2, // Always retry with attempt 2 for timeout
      excludeDriverIds: [jobSummary.driverId].filter(Boolean),
    });

    this.logger.log(
      `Retry ride matching for ${jobSummary.id} (excluded driver: ${jobSummary.driverId})`,
    );
  }

  private async retryDeliveryMatching(jobSummary: any): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: jobSummary.id },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery) {
      this.logger.error(`Delivery ${jobSummary.id} not found`);
      return;
    }

    if (delivery.status !== 'REQUESTED') {
      this.logger.log(
        `Delivery ${jobSummary.id} no longer REQUESTED, skipping retry`,
      );
      return;
    }

    await this.queue.enqueueDeliveryMatching({
      job: jobSummary,
      attempt: 2,
      excludeDriverIds: [jobSummary.driverId].filter(Boolean),
    });

    this.logger.log(
      `Retry delivery matching for ${jobSummary.id} (excluded driver: ${jobSummary.driverId})`,
    );
  }
}
