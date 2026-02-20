import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/matching/redis/redis.service';
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
    const [dbUsers, driverStates, riderStates] = await Promise.all([
      this.prisma.rider.findMany({
        where: { role: { in: [UserRole.DRIVER, UserRole.RIDER] } },
        select: {
          id: true,
          name: true,
          image: true,
          phone: true,
          role: true,
          vehicle: { select: { plateNumber: true } },
        },
      }),
      this.redis.getAllDriverStates().catch(() => []),
      this.redis.getAllRiderStates().catch(() => []),
    ]);

    // 2. Build lookup maps keyed by user id
    const driverStateMap = new Map(driverStates.map((s) => [s.id, s]));
    const riderStateMap = new Map(riderStates.map((s) => [s.id, s]));

    // 3. Build result — only include users where we have coordinates
    const result: LiveMapUser[] = [];

    for (const db of dbUsers) {
      const isDriver = db.role === UserRole.DRIVER;
      const state = isDriver
        ? driverStateMap.get(db.id)
        : riderStateMap.get(db.id);

      // Skip if no last known location is available
      if (!state?.location) continue;

      const loc = state.location as { lat: number; lng: number };

      result.push({
        id: db.id,
        name: db.name ?? (isDriver ? 'Unknown Driver' : 'Unknown Rider'),
        image: db.image ?? null,
        phone: db.phone ?? null,
        plateNumber: db.vehicle?.plateNumber ?? null,
        role: isDriver ? 'DRIVER' : 'RIDER',
        // Default to OFFLINE for anyone not in Redis
        status: state.status ?? 'OFFLINE',
        lastSeen: state.lastSeen ?? 0,
        lat: loc.lat,
        lng: loc.lng,
        currentJobId: state.currentJobId ?? null,
        currentJobType: state.currentJobType ?? null,
        pendingJobId: state.pendingJobId ?? null,
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
