import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RideStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../matching/queue/queue.service';
// Remove TRIPS_CONFIG import if not used elsewhere
import { TRIPS_CONFIG } from './trips.common.service'; 

@Injectable()
export class RidesCleanupService {
  private readonly logger = new Logger(RidesCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async recoverStuckRequestedRides() {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const stuckRides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.REQUESTED,
        updatedAt: { lt: twoMinutesAgo },
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
      take: 50,
    });

    if (stuckRides.length === 0) return;

    this.logger.warn(`Found ${stuckRides.length} stuck rides. Initiating recovery...`);

    for (const ride of stuckRides) {
      try {
        this.logger.log(`Recovering ride ${ride.id}`);

        // FIX: Strictly adhere to MatchRideJobData interface
        // Removed 'timestamp' and 'expiresAt' as they are not in the interface
        await this.queue.enqueueRideMatching({
          rideId: ride.id,
          customerId: ride.customerId,
          pickupLat: ride.pickupAddress.lat,
          pickupLng: ride.pickupAddress.lng,
          dropoffLat: ride.dropoffAddress.lat,
          dropoffLng: ride.dropoffAddress.lng,
          distanceKm: ride.distanceKm || 0,
          totalFare: Number(ride.totalFare) || 0,
          attempt: 1, // Reset attempt count
        });

        // Touch the ride to prevent immediate re-processing
        await this.prisma.ride.update({
          where: { id: ride.id },
          data: { updatedAt: new Date() },
        });

      } catch (error) {
        this.logger.error(`Failed to recover ride ${ride.id}`, error);
      }
    }
  }
}