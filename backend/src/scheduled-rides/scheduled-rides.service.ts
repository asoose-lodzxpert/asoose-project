import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookScheduledRideDto } from './dto/book-scheduled-ride.dto';
import { MapsService } from '../maps/maps.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FareService } from '../fare/fare.service';
import { addMinutes } from 'date-fns';
import { RideStatus } from '@prisma/client';
import { TripsCommonService } from '../users/trips/trips.common.service';

@Injectable()
export class ScheduledRidesService {
  private readonly logger = new Logger(ScheduledRidesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsService,
    private readonly notifications: NotificationsService,
    private readonly fare: FareService,
    @InjectQueue('scheduled-ride-assignment') private readonly assignmentQueue: Queue,
    @InjectQueue('scheduled-ride-reminder') private readonly reminderQueue: Queue,
    @InjectQueue('scheduled-ride-health') private readonly healthQueue: Queue,
    private readonly tripsCommonService: TripsCommonService,
  ) {}

  async bookScheduledRide(dto: BookScheduledRideDto, userId: string, idempotencyKey?: string) {
    // 0. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.prisma.ride.findFirst({
        where: { customerId: userId, idempotencyKey },
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
      });
      if (existing) {
        this.logger.log(`Idempotent request fulfilled for key: ${idempotencyKey}`);
        return existing;
      }
    }

    const now = new Date();
    const scheduledAt = new Date(dto.scheduledAt);

    // 1. Lead-time Validation (min 30 min, max 30 days)
    const minLeadTime = addMinutes(now, 30);
    const maxLeadTime = addMinutes(now, 30 * 24 * 60);

    if (scheduledAt < minLeadTime || scheduledAt > maxLeadTime) {
      throw new BadRequestException(
        'Scheduled time must be between 30 minutes and 30 days from now.',
      );
    }

    // 2. Resolve Addresses
    let pickupAddr: { lat: number; lng: number; address: string; id?: string };
    let dropoffAddr: { lat: number; lng: number; address: string; id?: string };

    if (dto.pickupAddressId) {
      const addr = await this.prisma.address.findUnique({ where: { id: dto.pickupAddressId } });
      if (!addr) throw new NotFoundException('Pickup address not found.');
      pickupAddr = { lat: addr.lat, lng: addr.lng, address: addr.street, id: addr.id };
    } else if (dto.pickupLocation) {
      const resolved = await this.tripsCommonService.resolveSecureLocation(dto.pickupLocation);
      pickupAddr = { ...resolved };
    } else {
      throw new BadRequestException('Pickup address ID or location payload required.');
    }

    if (dto.dropoffAddressId) {
      const addr = await this.prisma.address.findUnique({ where: { id: dto.dropoffAddressId } });
      if (!addr) throw new NotFoundException('Dropoff address not found.');
      dropoffAddr = { lat: addr.lat, lng: addr.lng, address: addr.street, id: addr.id };
    } else if (dto.dropoffLocation) {
      const resolved = await this.tripsCommonService.resolveSecureLocation(dto.dropoffLocation);
      dropoffAddr = { ...resolved };
    } else {
      throw new BadRequestException('Dropoff address ID or location payload required.');
    }

    // 3. Distance & Duration Estimation
    const directions = await this.maps.getDirections(
      String(pickupAddr.lat),
      String(pickupAddr.lng),
      String(dropoffAddr.lat),
      String(dropoffAddr.lng),
    );

    if (directions.error) {
      throw new BadRequestException(`Failed to calculate route: ${directions.error}`);
    }

    const durationMin = Math.ceil(directions.duration.value / 60);

    // 4. Fare Calculation (Fallback if not provided in DTO)
    const calculatedFare = await this.fare.getRideFare({
      pickuplat: String(pickupAddr.lat),
      pickuplong: String(pickupAddr.lng),
      dropofflat: String(dropoffAddr.lat),
      dropofflong: String(dropoffAddr.lng),
      vehicleType: dto.vehicleType,
    });

    // 5. Create Address Records if needed and Ride
    return this.prisma.$transaction(async (tx) => {
      let finalPickupId = pickupAddr.id;
      let finalDropoffId = dropoffAddr.id;

      if (!finalPickupId) {
        const addr = await tx.address.create({
          data: {
            userId,
            label: 'Pickup',
            street: pickupAddr.address,
            lat: pickupAddr.lat,
            lng: pickupAddr.lng,
            city: '',
            state: '',
          },
        });
        finalPickupId = addr.id;
      }

      if (!finalDropoffId) {
        const addr = await tx.address.create({
          data: {
            userId,
            label: 'Dropoff',
            street: dropoffAddr.address,
            lat: dropoffAddr.lat,
            lng: dropoffAddr.lng,
            city: '',
            state: '',
          },
        });
        finalDropoffId = addr.id;
      }

      const ride = await tx.ride.create({
          data: {
            customerId: userId,
            pickupAddressId: finalPickupId,
            dropoffAddressId: finalDropoffId,
            status: (RideStatus as any).SCHEDULED,
            isScheduled: true,
            scheduledAt: scheduledAt,
            scheduledFare: dto.totalFare ?? calculatedFare.price,
            totalFare: dto.totalFare ?? calculatedFare.price,
            baseFare: dto.baseFare ?? calculatedFare.breakdown.baseFare,
            distanceFare: dto.distanceFare ?? calculatedFare.breakdown.distanceFare,
            timeFare: dto.timeFare ?? calculatedFare.breakdown.timeFare,
            platformFee: dto.platformFee ?? calculatedFare.breakdown.platformFee,
            distanceKm: dto.distanceKm ?? calculatedFare.distance.value,
            durationMin: dto.durationMin ?? durationMin,
            vehicleType: dto.vehicleType,
            estimatedDurationMin: dto.durationMin ?? durationMin,
            estimatedEndTime: addMinutes(scheduledAt, dto.durationMin ?? durationMin),
            cancellationDeadline: addMinutes(scheduledAt, -60),
            idempotencyKey,
          } as any,
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
      });

      // 6. Enqueue Jobs
      const assignmentWindowMs = 90 * 60 * 1000;
      const leadTimeMs = scheduledAt.getTime() - now.getTime();
      const assignmentDelay = leadTimeMs - assignmentWindowMs;
      
      // If booked < 90 mins in advance, trigger assignment almost immediately (5s safety delay)
      const safeAssignmentDelay = assignmentDelay <= 0 ? 5000 : assignmentDelay;

      await this.assignmentQueue.add(
        'assign-scheduled-driver',
        { rideId: ride.id },
        { 
          jobId: `assign-${ride.id}`,
          delay: safeAssignmentDelay, 
          removeOnComplete: true 
        },
      );

      const reminder1Delay = (scheduledAt.getTime() - now.getTime()) - (120 * 60 * 1000);
      const reminder2Delay = (scheduledAt.getTime() - now.getTime()) - (30 * 60 * 1000);

      if (reminder1Delay > 0) {
        await this.reminderQueue.add(
          'send-reminder', 
          { rideId: ride.id, minutesBefore: 120 }, 
          { jobId: `reminder-120-${ride.id}`, delay: reminder1Delay }
        );
      }
      if (reminder2Delay > 0) {
        await this.reminderQueue.add(
          'send-reminder', 
          { rideId: ride.id, minutesBefore: 30 }, 
          { jobId: `reminder-30-${ride.id}`, delay: reminder2Delay }
        );
      }

      // 7. Admin Notification & Activity Log
      await this.tripsCommonService.logActivity(userId, 'SCHEDULED_RIDE_BOOKED', {
        rideId: ride.id,
        scheduledAt: ride.scheduledAt,
        totalFare: ride.totalFare,
      });

      const displayTime = ride.scheduledAt 
        ? new Date(ride.scheduledAt).toLocaleString() 
        : 'scheduled time';

      await this.notifications.createForAdmin({
        title: 'New Scheduled Ride Requested',
        message: `A new ride has been scheduled for ${displayTime}. (ID: ${ride.id.slice(0, 8)})`,
        type: 'RIDE',
        metadata: { rideId: ride.id, type: 'SCHEDULED_RIDE_REQUESTED' },
      });

      return ride;
    });
  }

  async getUpcomingRidesForCustomer(userId: string) {
    return this.prisma.ride.findMany({
      where: {
        customerId: userId,
        isScheduled: true,
        status: { in: [(RideStatus as any).SCHEDULED, (RideStatus as any).DRIVER_ASSIGNED_SCHED, RideStatus.DRIVER_ACCEPTED, RideStatus.PAID] } as any,
      } as any,
      orderBy: { scheduledAt: 'asc' } as any,
      include: {
        rider: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });
  }

  async getUpcomingRidesForDriver(riderId: string) {
    return this.prisma.ride.findMany({
      where: {
        riderId,
        isScheduled: true,
        status: { in: [(RideStatus as any).DRIVER_ASSIGNED_SCHED, RideStatus.DRIVER_ACCEPTED, RideStatus.PAID] } as any,
      } as any,
      orderBy: { scheduledAt: 'asc' } as any,
      include: {
        customer: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });
  }

  async cancelScheduledRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found.');
    }

    const now = new Date();
    let lateCancellation = false;

    if ((ride as any).cancellationDeadline && now > (ride as any).cancellationDeadline) {
      lateCancellation = true;
      // TODO: Handle late cancellation penalty if needed
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: (RideStatus as any).CANCELLED_SCHEDULED,
        lateCancellation,
        cancelledAt: now,
        cancelledBy: userId,
      } as any,
    });

    // 1. Clean up delayed jobs to prevent ghost notifications
    try {
      await Promise.all([
        this.assignmentQueue.remove(`assign-${rideId}`),
        this.reminderQueue.remove(`reminder-120-${rideId}`),
        this.reminderQueue.remove(`reminder-30-${rideId}`),
      ]);
    } catch (err) {
      this.logger.warn(`Failed to clean up some jobs for ride ${rideId}: ${err.message}`);
    }

    this.logger.log(`Ride ${rideId} cancelled by user ${userId}. Late: ${lateCancellation}`);

    await this.tripsCommonService.logActivity(userId, 'SCHEDULED_RIDE_CANCELLED', {
      rideId,
      late: lateCancellation,
    });

    await this.notifications.createForAdmin({
      title: 'Scheduled Ride Cancelled',
      message: `Scheduled ride ${rideId.slice(0, 8)} was cancelled by the user.`,
      type: 'RIDE',
      metadata: { rideId, type: 'SCHEDULED_RIDE_CANCELLED' },
    });

    if (ride.riderId) {
      await this.notifications.createForRider({
        riderId: ride.riderId,
        title: 'Ride Cancelled',
        message: `The customer has cancelled your upcoming scheduled ride for ${(ride as any).scheduledAt.toLocaleString()}.`,
        type: 'TRIP',
        metadata: { rideId, type: 'SCHEDULED_RIDE_CANCELLED' },
      });
    }

    return updatedRide;
  }

  async cancelScheduledRideByDriver(rideId: string, driverId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.riderId !== driverId) {
      throw new NotFoundException('Ride not found or not assigned to you.');
    }

    const now = new Date();
    const scheduledAt = new Date((ride as any).scheduledAt);
    const thirtyMinutesFromNow = addMinutes(now, 30);

    if (scheduledAt < thirtyMinutesFromNow) {
      throw new BadRequestException(
        'You cannot cancel a scheduled ride less than 30 minutes before the pickup time.',
      );
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: (RideStatus as any).SCHEDULED, // Re-list the ride for other drivers
        riderId: null,
        assignedBy: null,
      } as any,
    });

    await this.tripsCommonService.logActivity(driverId, 'SCHEDULED_RIDE_DECLINED_BY_DRIVER', {
      rideId,
    });

    // Re-enqueue the assignment job to find a new driver
    await this.assignmentQueue.add(
      'assign-scheduled-driver',
      { rideId: ride.id },
      { 
        jobId: `assign-${ride.id}`,
        delay: 5000, 
        removeOnComplete: true 
      },
    );

    return updatedRide;
  }
}
