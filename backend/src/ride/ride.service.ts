import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis'; // Or your preferred Redis client
import { RideStatus } from '@prisma/client';
import { RidersStreamService } from '../riders/riders-stream.service';

@Injectable()
export class RideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: Redis, // Injected Redis client
    private readonly ridersStreamService: RidersStreamService,
  ) {}

  async findActiveRideForDriver(userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        riderId: userId,
        status: { in: [RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] },
      },
    });
    return ride;
  }

  async findIncomingRidesForDriver(userId: string) {
    // Find rides assigned/requested for this rider
    return await this.prisma.ride.findMany({
      where: {
        riderId: userId,
        status: { in: [RideStatus.REQUESTED] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRide(jobId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== userId)
      throw new BadRequestException('Not assigned to this rider');
    if (ride.status !== RideStatus.REQUESTED)
      throw new BadRequestException('Ride not in REQUESTED status');
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: { status: RideStatus.ACCEPTED, acceptedAt: new Date() },
    });
    this.ridersStreamService.emitJobAssigned(
      ride.riderId,
      jobId,
      'RIDE',
      updated,
    );
    return updated;
  }

  async updateRideStatus(jobId: string, status: RideStatus) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: { status },
    });
    const eventRiderId = updated.riderId ?? ride.riderId;
    if (!eventRiderId) {
      throw new Error('riderId is missing for job event emission');
    }
    this.ridersStreamService.emitJobUpdate(
      eventRiderId,
      jobId,
      'RIDE',
      updated,
    );
    return updated;
  }

  async completeRide(jobId: string, payload: any) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status !== RideStatus.IN_PROGRESS)
      throw new BadRequestException('Ride not in progress');
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: {
        status: RideStatus.COMPLETED,
        completedAt: new Date(),
        ...payload,
      },
    });
    this.ridersStreamService.emitJobUpdate(
      (updated.riderId ?? ride.riderId) || '',
      jobId,
      'RIDE',
      updated,
    );
    // Optionally update rider stats, earnings, etc.
    return updated;
  }

  async setDriverOnline(userId: string, latitude: number, longitude: number) {
    // Add rider to Redis geospatial set for matching
    await this.redis.geoadd('riders:online', longitude, latitude, userId);
    await this.prisma.rider.update({
      where: { id: userId },
      data: { isOnline: true, currentLat: latitude, currentLng: longitude },
    });
    return { success: true };
  }

  async setDriverOffline(userId: string) {
    // Remove rider from Redis geospatial set
    await this.redis.zrem('riders:online', userId);
    await this.prisma.rider.update({
      where: { id: userId },
      data: { isOnline: false },
    });
    return { success: true };
  }

  async updateDriverOnlineStatus(
    userId: string,
    isOnline: boolean,
    latitude?: number,
    longitude?: number,
  ) {
    await this.prisma.rider.update({
      where: { id: userId },
      data: {
        isOnline,
        ...(latitude !== undefined && { currentLat: latitude }),
        ...(longitude !== undefined && { currentLng: longitude }),
      },
    });
    return { success: true };
  }

  async declineRide(jobId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== userId)
      throw new BadRequestException('Not assigned to this rider');
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: {
        status: RideStatus.CANCELLED,
        cancelledBy: userId,
        cancelledAt: new Date(),
      },
    });
    // Remove from matching if needed
    await this.redis.zrem('riders:online', userId);
    this.ridersStreamService.emitJobCancelled(
      ride.riderId,
      jobId,
      'RIDE',
      'Declined by rider',
    );
    return updated;
  }

  async arrivePickup(jobId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== userId)
      throw new BadRequestException('Not assigned to this rider');
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: { status: RideStatus.IN_PROGRESS, startedAt: new Date() },
    });
    this.ridersStreamService.emitJobUpdate(
      ride.riderId,
      jobId,
      'RIDE',
      updated,
    );
    return updated;
  }

  async confirmPickup(jobId: string, userId: string) {
    // For rides, confirm pickup is usually the same as arrivePickup
    return this.arrivePickup(jobId, userId);
  }

  async arriveDropoff(jobId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: jobId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== userId)
      throw new BadRequestException('Not assigned to this rider');
    // For ride, dropoff means complete
    const updated = await this.prisma.ride.update({
      where: { id: jobId },
      data: { status: RideStatus.COMPLETED, completedAt: new Date() },
    });
    this.ridersStreamService.emitJobUpdate(
      ride.riderId,
      jobId,
      'RIDE',
      updated,
    );
    return updated;
  }
}
