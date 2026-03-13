import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/matching/redis/redis.service';
import {
  DriverState,
  RiderState,
} from 'src/matching/redis/redis-keys.constants';
import { UserRole } from '@prisma/client';

export interface LiveMapUser {
  id: string;
  name: string;
  image: string | null;
  phone: string | null;
  plateNumber: string | null;
  /** DRIVER (ride-hailing) or RIDER (delivery) */
  role: 'DRIVER' | 'RIDER';
  /** Redis status: ONLINE | OFFLINE | ACTIVE | … */
  status: string;
  /** Unix ms of last heartbeat (0 if never seen) */
  lastSeen: number;
  lat: number;
  lng: number;
  currentJobId: string | null;
  currentJobType: string | null;
  pendingJobId: string | null;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getLiveLocations(): Promise<LiveMapUser[]> {
    // 1. Fetch ALL Prisma riders/drivers + ALL Redis states in parallel.
    //    Location key is NOT deleted on offline, so last known coords persist.
    //    We also select isOnline / currentLat / currentLng as a DB fallback.
    const [dbUsers, driverStates, riderStates] = await Promise.all([
      this.prisma.rider.findMany({
        where: { role: { in: [UserRole.DRIVER, UserRole.RIDER] } },
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          role: true,
          isOnline: true,
          currentLat: true,
          currentLng: true,
          vehicle: { select: { plateNumber: true } },
        },
      }),
      this.redis.getAllDriverStates().catch((): DriverState[] => []),
      this.redis.getAllRiderStates().catch((): RiderState[] => []),
    ]);

    // 2. Build lookup maps keyed by user id
    const driverStateMap = new Map<string, DriverState>(
      driverStates.map((s): [string, DriverState] => [s.id, s]),
    );
    const riderStateMap = new Map<string, RiderState>(
      riderStates.map((s): [string, RiderState] => [s.id, s]),
    );

    // 3. Build result — include users where we have coordinates (Redis or DB).
    //
    // IMPORTANT: A single person can hold both RIDER and DRIVER roles and uses
    // the same app. Location is emitted under whichever role they are currently
    // active as — which may differ from their Prisma `role` column. We therefore
    // check BOTH Redis state maps for every user and pick the state that has a
    // location, preferring the most-recently-seen one when both have coordinates.
    // When Redis has no location, we fall back to the DB's currentLat/currentLng.
    const result: LiveMapUser[] = [];

    for (const db of dbUsers) {
      const prismaIsDriver = db.role === UserRole.DRIVER;

      const driverState = driverStateMap.get(db.id);
      const riderState = riderStateMap.get(db.id);

      // Resolve which state to use: prefer the one with a location; if both
      // have one, use the more recently updated.
      let state: DriverState | RiderState | undefined =
        driverState ?? riderState;
      let effectiveRole: 'DRIVER' | 'RIDER' = prismaIsDriver
        ? 'DRIVER'
        : 'RIDER';

      if (driverState?.location && riderState?.location) {
        // Both have coords — use the freshest heartbeat
        if ((riderState.lastSeen ?? 0) > (driverState.lastSeen ?? 0)) {
          state = riderState;
          effectiveRole = 'RIDER';
        } else {
          state = driverState;
          effectiveRole = 'DRIVER';
        }
      } else if (driverState?.location) {
        state = driverState;
        effectiveRole = 'DRIVER';
      } else if (riderState?.location) {
        state = riderState;
        effectiveRole = 'RIDER';
      }

      // Resolve final lat/lng — Redis location first, then DB fallback
      const redisLoc = state?.location as
        | NonNullable<DriverState['location']>
        | null
        | undefined;
      const lat: number = redisLoc?.lat ?? db.currentLat ?? 0;
      const lng: number = redisLoc?.lng ?? db.currentLng ?? 0;

      // Skip if no location data is available anywhere
      if (!lat || !lng) continue;

      result.push({
        id: db.id,
        name:
          db.name ??
          (effectiveRole === 'DRIVER' ? 'Unknown Driver' : 'Unknown Rider'),
        image: db.image ?? null,
        phone: db.phone ?? null,
        plateNumber: db.vehicle?.plateNumber ?? null,
        role: effectiveRole,
        // Use Redis status when available; fall back to DB isOnline flag
        status: state?.status ?? (db.isOnline ? 'ONLINE' : 'OFFLINE'),
        lastSeen: state?.lastSeen ?? 0,
        lat,
        lng,
        currentJobId: state?.currentJobId ?? null,
        currentJobType: state?.currentJobType ?? null,
        pendingJobId: state?.pendingJobId ?? null,
      });
    }

    this.logger.log(
      `Live map: ${result.filter((u) => u.role === 'DRIVER').length} drivers, ` +
        `${result.filter((u) => u.role === 'RIDER').length} riders ` +
        `(${result.filter((u) => u.status !== 'OFFLINE').length} active)`,
    );

    return result;
  }
}
