import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  HandleAssignmentTimeoutJobData,
} from '../queue/queue.constants';
import { DriverStateService } from '../driver-state/driver-state.service';
import { RiderStateService } from '../rider-state/rider-state.service';
import { QueueService } from '../queue/queue.service';
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
    private readonly riderState: RiderStateService,
    private readonly queue: QueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<HandleAssignmentTimeoutJobData>): Promise<void> {
    const { job: jobSummary, driverId, attempt = 1 } = job.data;
    const jobType = jobSummary.jobType;
    const jobId = jobSummary.id;

    this.logger.log(
      `Handling assignment timeout: ${jobType} ${jobId} (attempt ${attempt}, driver: ${driverId ?? 'unknown'})`,
    );

    try {
      if (jobType === 'ride') {
        if (!driverId) {
          // BUG-1 fix: driverId is now forwarded from matching processor.
          // If it's missing (old job in queue), log and still retry.
          this.logger.warn(
            `No driverId in timeout payload for ride ${jobId} — skipping driver state cleanup.`,
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
        const riderId = delivery?.riderId ?? undefined;
        if (!riderId) {
          this.logger.warn(
            `No riderId found for delivery ${jobId}, skipping rider state cleanup.`,
          );
        } else {
          try {
            await this.riderState.declineJob(
              riderId,
              { jobId, jobType: 'delivery' },
              'timeout',
            );
            this.logger.log(
              `Cleared pending delivery ${jobId} from rider ${riderId} after timeout`,
            );
          } catch (e) {
            this.logger.warn(
              `Could not clear delivery timeout state for rider ${riderId}: ${e?.message}`,
            );
          }
        }
      }

      // Re-enqueue matching job to find another driver
      if (jobType === 'ride') {
        await this.retryRideMatching(jobSummary, attempt, driverId);
      } else {
        await this.retryDeliveryMatching(jobSummary, attempt);
      }
    } catch (error) {
      this.logger.error(
        `Error handling timeout for ${jobType} ${jobId}:`,
        error,
      );
      // Don't throw - timeout already occurred
    }
  }

  private async retryRideMatching(
    jobSummary: any,
    attempt: number,
    timedOutDriverId?: string,
  ): Promise<void> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: jobSummary.id },
    });

    if (!ride) {
      this.logger.error(`Ride ${jobSummary.id} not found`);
      return;
    }

    if (ride.status !== 'REQUESTED' && ride.status !== 'SEARCHING_DRIVER') {
      this.logger.log(
        `Ride ${jobSummary.id} no longer matchable (status: ${ride.status}), skipping retry`,
      );
      return;
    }

    const nextAttempt = attempt + 1; // BUG-2 fix: increment from actual attempt count
    const excludeDriverIds = timedOutDriverId ? [timedOutDriverId] : []; // BUG-1 fix

    await this.queue.enqueueRideMatching({
      job: jobSummary,
      attempt: nextAttempt,
      excludeDriverIds,
    });

    this.logger.log(
      `Retry ride matching for ${jobSummary.id} (attempt ${nextAttempt}, excluded: ${excludeDriverIds.join(',') || 'none'})`,
    );
  }

  private async retryDeliveryMatching(
    jobSummary: any,
    attempt: number,
  ): Promise<void> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: jobSummary.id },
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

    const nextAttempt = attempt + 1; // BUG-2 fix

    await this.queue.enqueueDeliveryMatching({
      job: jobSummary,
      attempt: nextAttempt,
      excludeDriverIds: [],
    });

    this.logger.log(
      `Retry delivery matching for ${jobSummary.id} (attempt ${nextAttempt})`,
    );
  }
}
