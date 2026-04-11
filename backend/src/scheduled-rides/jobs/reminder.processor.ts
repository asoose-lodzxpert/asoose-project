import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { RideStatus } from '@prisma/client';

@Processor('scheduled-ride-reminder', {
  concurrency: 10,
})
export class ScheduledRideReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledRideReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ rideId: string; minutesBefore: number }>): Promise<void> {
    const { rideId, minutesBefore } = job.data;
    this.logger.log(`Processing reminder (${minutesBefore}m) for scheduled ride ${rideId}`);

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        customer: true,
        rider: true, // Assigned driver
      },
    });

    if (!ride || ride.status === RideStatus.CANCELLED || ride.status === RideStatus.CANCELLED_SCHEDULED) {
      this.logger.warn(`Ride ${rideId} cancelled or not found. Skipping reminder.`);
      return;
    }

    // 1. Notify Customer
    await this.notifications.create({
      userId: ride.customerId,
      title: 'Upcoming Scheduled Ride',
      message: `Your scheduled ride is in ${minutesBefore} minutes. Your driver will arrive soon.`,
      type: 'TRIP',
      metadata: { rideId, type: 'SCHEDULED_RIDE_REMINDER' },
    });

    // 2. Notify Driver (if assigned)
    if (ride.riderId) {
      await this.notifications.createForRider({
        riderId: ride.riderId,
        title: 'Scheduled Ride Reminder',
        message: `Reminder: You have a scheduled ride in ${minutesBefore} minutes. Please prepare for pickup.`,
        type: 'TRIP',
        metadata: { rideId, type: 'SCHEDULED_RIDE_REMINDER' },
      });
    }

    // 3. Log Reminder
    await (this.prisma as any).scheduledRideReminder.create({
      data: {
        rideId,
        scheduledFor: new Date(), // Job actual execution time
        minutesBefore,
        channel: 'PUSH',
        success: true,
        bullJobId: job.id,
      },
    });

    this.logger.log(`Reminders sent for ride ${rideId} (${minutesBefore}m before)`);
  }
}
