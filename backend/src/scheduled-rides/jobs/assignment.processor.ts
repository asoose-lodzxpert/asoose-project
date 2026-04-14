import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { RideStatus, UserRole } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { TripsCommonService } from '../../users/trips/trips.common.service';

@Processor('scheduled-ride-assignment', {
  concurrency: 5,
})
export class ScheduledRideAssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledRideAssignmentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly tripsCommonService: TripsCommonService,
    @InjectQueue('scheduled-ride-assignment') private readonly assignmentQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ rideId: string; retryCount?: number }>): Promise<void> {
    const { rideId, retryCount = 0 } = job.data;
    this.logger.log(`Processing assignment for scheduled ride ${rideId} (Attempt #${retryCount + 1})`);

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });

    if (!ride || ride.status !== (RideStatus as any).SCHEDULED) {
      this.logger.warn(`Ride ${rideId} not found or not in SCHEDULED status.`);
      return;
    }

    // 1. Find potential drivers
    // - Role: RIDER (used for drivers in this system)
    // - Status: ACTIVE
    // - Online: true
    // - No overlapping scheduled rides
    
    const potentialDrivers = await this.prisma.rider.findMany({
      where: {
        role: UserRole.RIDER,
        status: 'ACTIVE',
        isOnline: true,
        // Check for existing overlapping rides
        rides: {
          none: {
            isScheduled: true,
            status: { in: [(RideStatus as any).SCHEDULED, (RideStatus as any).DRIVER_ASSIGNED_SCHED, RideStatus.DRIVER_ACCEPTED] } as any,
            scheduledAt: {
              gte: addMinutes((ride as any).scheduledAt, -60), // Padding
              lte: addMinutes((ride as any).scheduledAt, ((ride as any).estimatedDurationMin || 30) + 60),
            },
          },
        },
        unavailabilities: {
          none: {
             startsAt: { lte: (ride as any).scheduledAt },
             endsAt: { gte: (ride as any).scheduledAt },
          }
        }
      },
      orderBy: { rating: 'desc' },
      take: 5,
    });

    if (potentialDrivers.length === 0) {
      const MAX_RETRIES = 5;
      if (retryCount < MAX_RETRIES) {
        this.logger.log(`No drivers found for ride ${rideId}. Re-enqueuing (Try ${retryCount + 1}/${MAX_RETRIES + 1})`);
        await this.assignmentQueue.add(
          'assign-scheduled-driver',
          { ...job.data, retryCount: retryCount + 1 },
          { 
            delay: 15 * 60 * 1000, 
            removeOnComplete: true, 
            jobId: `assign-${rideId}` 
          },
        );
        return;
      }

      this.logger.warn(`Max retries reached. No potential drivers found for ride ${rideId}. Notifying admins.`);
      await this.notifications.createForAdmin({
        title: 'Assignment Failed',
        message: `Could not find an available driver for scheduled ride ${rideId.slice(0, 8)} after multiple attempts. Manual intervention required.`,
        type: 'RIDE',
        metadata: { rideId, type: 'SCHEDULED_ASSIGNMENT_FAILED' },
      });
      return;
    }

    // 2. Assign to the best candidate
    const bestDriver = potentialDrivers[0];

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        riderId: bestDriver.id,
        status: (RideStatus as any).DRIVER_ASSIGNED_SCHED,
        assignedBy: 'SYSTEM',
      } as any,
    });

    // 3. Notify Driver
    const timeStr = (ride as any).scheduledAt instanceof Date 
      ? (ride as any).scheduledAt.toLocaleTimeString()
      : new Date((ride as any).scheduledAt).toLocaleTimeString();

    await this.notifications.createForRider({
      riderId: bestDriver.id,
      title: 'New Scheduled Ride Assigned',
      message: `You have been assigned a ride for ${timeStr}. Please check your upcoming rides.`,
      type: 'TRIP',
      metadata: { rideId, type: 'SCHEDULED_RIDE_ASSIGNED' },
    });

    // ── Real-time Socket Emission ──
    // Emit job.assigned so the app shows the "New Job" sheet immediately
    try {
      this.notificationsGateway.emitJobAssigned(bestDriver.id, {
        id: rideId,
        jobType: 'ride',
        pickupAddress: ride.pickupAddress,
        dropoffAddress: (ride as any).dropoffAddress || {}, // Might need to include more details
        customerName: ride.customer?.name || 'Customer',
        earnings: (ride as any).totalFare || (ride as any).scheduledFare || 0,
        isScheduled: true,
        scheduledAt: (ride as any).scheduledAt,
      });
    } catch (err) {
      this.logger.error(`Failed to emit job.assigned for scheduled ride ${rideId}: ${err.message}`);
    }

    // 4. Activity Log & Admin Notification
    await this.tripsCommonService.logActivity(ride.customerId, 'SCHEDULED_RIDE_ASSIGNED', {
      rideId,
      riderId: bestDriver.id,
    });

    await this.notifications.createForAdmin({
      title: 'Scheduled Ride Assigned',
      message: `Driver ${bestDriver.id.slice(0, 8)} has been assigned to ride ${rideId.slice(0, 8)}.`,
      type: 'RIDE',
      metadata: { rideId, riderId: bestDriver.id, type: 'SCHEDULED_RIDE_ASSIGNED' },
    });

    this.logger.log(`Ride ${rideId} assigned to driver ${bestDriver.id}`);
  }
}
