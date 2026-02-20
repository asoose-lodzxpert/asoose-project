import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DriverStateService } from './driver-state/driver-state.service';
import { RiderStateService } from './rider-state/rider-state.service';

/**
 * StartupReconciliationService
 *
 * Runs once on application bootstrap to reconcile Redis driver/rider state
 * against the Prisma DB. A server restart clears ioredis (DB 1) in-memory
 * structures but Prisma may still show riders as `isOnline: true`.
 *
 * Strategy:
 *  - For each rider with isOnline=true AND valid GPS coordinates → call
 *    setOnline() to re-populate Redis hex sets and geo index.
 *  - For each rider with isOnline=true but missing coordinates → set
 *    isOnline=false in Prisma (they must tap Go Online again).
 *
 * This makes a server restart transparent to the driver — their position is
 * restored within the reconciliation window and they can receive jobs again.
 */
@Injectable()
export class StartupReconciliationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driverStateService: DriverStateService,
    private readonly riderStateService: RiderStateService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Starting Redis ↔ DB reconciliation…');

    try {
      await this.reconcileRiders();
    } catch (err) {
      // Non-fatal — log and continue. Riders will self-heal as they send
      // location updates.
      this.logger.error('Reconciliation failed (non-fatal):', err?.message);
    }
  }

  private async reconcileRiders(): Promise<void> {
    const onlineRiders = await this.prisma.rider.findMany({
      where: { isOnline: true, status: 'ACTIVE' },
      select: { id: true, role: true, currentLat: true, currentLng: true },
    });

    this.logger.log(
      `Found ${onlineRiders.length} rider(s)/driver(s) marked online in DB`,
    );

    const noCoords: string[] = [];
    let restored = 0;
    let failed = 0;

    for (const rider of onlineRiders) {
      if (rider.currentLat == null || rider.currentLng == null) {
        noCoords.push(rider.id);
        continue;
      }

      try {
        if (rider.role === 'DRIVER') {
          await this.driverStateService.setOnline(
            rider.id,
            rider.currentLat,
            rider.currentLng,
          );
        } else {
          await this.riderStateService.setOnline(
            rider.id,
            rider.currentLat,
            rider.currentLng,
          );
        }
        restored++;
        this.logger.debug(
          `Restored ${rider.role} ${rider.id} at [${rider.currentLat}, ${rider.currentLng}]`,
        );
      } catch (err) {
        // e.g. outside service area — mark offline so they re-register
        this.logger.warn(
          `Could not restore ${rider.id}: ${err?.message} — marking offline`,
        );
        noCoords.push(rider.id);
        failed++;
      }
    }

    // Mark riders without valid coords as offline in Prisma
    if (noCoords.length > 0) {
      await this.prisma.rider.updateMany({
        where: { id: { in: noCoords } },
        data: { isOnline: false },
      });
      this.logger.log(
        `Marked ${noCoords.length} rider(s) offline (no GPS / outside area)`,
      );
    }

    this.logger.log(
      `Reconciliation complete — restored: ${restored}, cleared: ${noCoords.length}, failed: ${failed}`,
    );
  }
}
