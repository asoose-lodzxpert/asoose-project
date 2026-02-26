import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RideStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../matching/queue/queue.service';
import { rideToJobSummary } from 'src/riders/jobs/job.dto';

@Injectable()
export class RidesCleanupService {
  private readonly logger = new Logger(RidesCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStuckRequestedRides() {
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const stuckRides = await this.prisma.ride.findMany({
        where: {
          // Recover rides stuck in SEARCHING_DRIVER state (new flow)
          // Also recover REQUESTED (legacy) as a safety net
          status: { in: ['SEARCHING_DRIVER', 'REQUESTED'] as any[] },
          updatedAt: { lt: twoMinutesAgo },
        },
        include: {
          pickupAddress: true,
          dropoffAddress: true,
        },
        take: 50,
      });

      if (stuckRides.length === 0) return;

      this.logger.warn(
        `Found ${stuckRides.length} stuck rides. Initiating recovery...`,
      );

      for (const ride of stuckRides) {
        try {
          this.logger.log(`Recovering ride ${ride.id}`);

          const job = rideToJobSummary(ride);
          await this.queue.enqueueRideMatching({ job, attempt: 1 });

          // Touch the ride to prevent immediate re-processing
          await this.prisma.ride.update({
            where: { id: ride.id },
            data: { updatedAt: new Date() },
          });
        } catch (error) {
          this.logger.error(`Failed to recover ride ${ride.id}`, error);
        }
      }
    } catch (error: any) {
      // P1017 = "Server has closed the connection" — transient DB drop.
      // Re-connect so the next cron tick succeeds instead of staying broken.
      if (error?.code === 'P1017') {
        this.logger.warn(
          'DB connection was closed (P1017) during cleanup — reconnecting...',
        );
        try {
          await this.prisma.$connect();
        } catch (connectErr) {
          this.logger.error('Failed to reconnect to DB', connectErr);
        }
      } else {
        this.logger.error('recoverStuckRequestedRides failed', error);
      }
    }
  }

  /**
   * Cancel rides that have been stuck in a non-terminal state for more than 30 minutes.
   * These are truly abandoned rides that the recovery cron couldn't fix.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelAbandonedRides() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const abandonedRides = await this.prisma.ride.findMany({
        where: {
          status: {
            in: [
              'REQUESTED',
              'SEARCHING_DRIVER',
              'DRIVER_ASSIGNED',
              'DRIVER_ACCEPTED',
              'PAID',
            ] as any[],
          },
          updatedAt: { lt: thirtyMinutesAgo },
        },
        take: 100,
      });

      if (abandonedRides.length === 0) return;

      this.logger.warn(
        `Cancelling ${abandonedRides.length} abandoned rides (stuck > 30 min)`,
      );

      for (const ride of abandonedRides) {
        try {
          await this.prisma.ride.update({
            where: { id: ride.id },
            data: { status: 'CANCELLED_BY_SYSTEM' as any },
          });
          this.logger.log(
            `Auto-cancelled abandoned ride ${ride.id} (was ${ride.status})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to cancel abandoned ride ${ride.id}`,
            error,
          );
        }
      }
    } catch (error: any) {
      if (error?.code === 'P1017') {
        this.logger.warn(
          'DB connection closed (P1017) during abandoned-ride cleanup — reconnecting...',
        );
        try {
          await this.prisma.$connect();
        } catch (connectErr) {
          this.logger.error('Failed to reconnect to DB', connectErr);
        }
      } else {
        this.logger.error('cancelAbandonedRides failed', error);
      }
    }
  }
}
