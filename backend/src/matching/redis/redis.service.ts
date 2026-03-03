import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { MATCHING_REDIS_CLIENT } from './redis.constants';
import {
  REDIS_KEYS,
  REDIS_TTL,
  DriverStatus,
  DriverState,
  JobType,
  DriverRole,
  RiderStatus,
  RiderState,
} from './redis-keys.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  /**
   * Returns the active ride ID for a driver (if any).
   * Reads the Lua-written key — driver:{id}:currentRide.
   */
  async getDriverActiveRide(driverId: string): Promise<string | null> {
    const rideId = await this.redis.get(`driver:${driverId}:currentRide`);
    return rideId || null;
  }

  /**
   * Returns the customer/user ID for a given ride/job (if any).
   * The key is written by the matching processor via attemptAssignment.
   */
  async getRideCustomer(rideId: string): Promise<string | null> {
    const customerId = await this.redis.get(REDIS_KEYS.RIDE_CUSTOMER(rideId));
    return customerId || null;
  }

  constructor(@Inject(MATCHING_REDIS_CLIENT) private readonly redis: Redis) {}

  getClient(): Redis {
    return this.redis;
  }

  // ========================================
  // DRIVER STATE OPERATIONS
  // ========================================

  async getDriverState(driverId: string): Promise<DriverState | null> {
    const pipeline = this.redis.pipeline();

    pipeline.get(REDIS_KEYS.DRIVER_STATUS(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_ROLE(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_HEX(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_LAST_SEEN(driverId));
    // NOTE: Lua scripts write job state under type-specific keys:
    //   driver:{id}:pendingRide   / driver:{id}:pendingDelivery
    //   driver:{id}:currentRide   / driver:{id}:currentDelivery
    // We read both variants and coalesce so this TypeScript view stays
    // consistent with what the atomic Lua scripts actually store.
    pipeline.get(`driver:${driverId}:currentRide`);
    pipeline.get(`driver:${driverId}:currentDelivery`);
    pipeline.get(`driver:${driverId}:pendingRide`);
    pipeline.get(`driver:${driverId}:pendingDelivery`);
    pipeline.get(REDIS_KEYS.DRIVER_LOCATION(driverId));

    const results = await pipeline.exec();
    if (!results) return null;

    const [
      status,
      role,
      hexId,
      lastSeen,
      currentRide,
      currentDelivery,
      pendingRide,
      pendingDelivery,
      location,
    ] = results.map((r) => r[1]);

    if (!status) return null;

    // Coalesce type-specific keys into the unified DriverState contract
    const currentJobId =
      (currentRide as string | null) ?? (currentDelivery as string | null);
    const currentJobType: JobType | null = currentRide
      ? JobType.RIDE
      : currentDelivery
        ? JobType.DELIVERY
        : null;
    const pendingJobId =
      (pendingRide as string | null) ?? (pendingDelivery as string | null);
    const pendingJobType: JobType | null = pendingRide
      ? JobType.RIDE
      : pendingDelivery
        ? JobType.DELIVERY
        : null;

    return {
      id: driverId,
      // Fall back to 'DRIVER' if the role key was not written by an older
      // version of ATOMIC_SET_ONLINE (pre-fix). New clients always write it.
      role: (role ?? 'DRIVER') as DriverRole,
      status: status as DriverStatus,
      hexId: hexId as string | null,
      lastSeen: lastSeen ? parseInt(lastSeen as string, 10) : 0,
      currentJobId,
      currentJobType,
      pendingJobId,
      pendingJobType,
      location: location ? JSON.parse(location as string) : null,
    };
  }

  async setDriverStatus(driverId: string, status: DriverStatus): Promise<void> {
    await this.redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), status);
  }

  async getDriverStatus(driverId: string): Promise<DriverStatus | null> {
    const status = await this.redis.get(REDIS_KEYS.DRIVER_STATUS(driverId));
    return status as DriverStatus | null;
  }

  async updateLastSeen(driverId: string): Promise<void> {
    await this.redis.set(
      REDIS_KEYS.DRIVER_LAST_SEEN(driverId),
      Date.now().toString(),
    );
  }

  /** Separate lastSeen updater for the RIDER (delivery) namespace. */
  async updateRiderLastSeen(riderId: string): Promise<void> {
    await this.redis.set(
      REDIS_KEYS.RIDER_LAST_SEEN(riderId),
      Date.now().toString(),
    );
  }

  async getInactiveDrivers(
    inactivityThreshold: number = REDIS_TTL.DRIVER_INACTIVITY,
  ): Promise<string[]> {
    // BUG-6 fix: use the drivers:active SET instead of an O(N) KEYS scan
    const driverIds = await this.redis.smembers(REDIS_KEYS.DRIVERS_ACTIVE_SET);

    const inactive: string[] = [];
    const now = Date.now();
    const thresholdMs = inactivityThreshold * 1000;

    for (const driverId of driverIds) {
      const [status, lastSeen] = await Promise.all([
        this.redis.get(REDIS_KEYS.DRIVER_STATUS(driverId)),
        this.redis.get(REDIS_KEYS.DRIVER_LAST_SEEN(driverId)),
      ]);

      if (
        status === DriverStatus.ONLINE &&
        lastSeen &&
        now - parseInt(lastSeen, 10) > thresholdMs
      ) {
        inactive.push(driverId);
      }
    }

    return inactive;
  }

  // ========================================
  // HEX INDEX OPERATIONS
  // ========================================

  async addDriverToHex(driverId: string, hexId: string): Promise<void> {
    await this.redis.sadd(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId), driverId);
    // BUG-9 fix: count is derived from SCARD rather than a drifting INCR key
  }

  async removeDriverFromHex(driverId: string, hexId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId), driverId);
    // BUG-9 fix: count is derived from SCARD rather than a drifting DECR key
  }

  async getDriversInHex(hexId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId));
  }

  /** Get all available riders (delivery) in a hex */
  async getRidersInHex(hexId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.HEX_AVAILABLE_RIDERS(hexId));
  }

  /** BUG-9 fix: derive count from SCARD so it's always accurate. */
  async getHexDriverCount(hexId: string): Promise<number> {
    return this.redis.scard(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId));
  }

  // ========================================
  // RIDER STATE OPERATIONS
  // ========================================

  async getInactiveRiders(
    inactivityThreshold: number = REDIS_TTL.RIDER_INACTIVITY,
  ): Promise<string[]> {
    // BUG-6 fix: use the riders:active SET instead of an O(N) KEYS scan
    const riderIds = await this.redis.smembers(REDIS_KEYS.RIDERS_ACTIVE_SET);
    const inactive: string[] = [];
    const now = Date.now();
    const thresholdMs = inactivityThreshold * 1000;

    for (const riderId of riderIds) {
      const [status, lastSeen] = await Promise.all([
        this.redis.get(REDIS_KEYS.RIDER_STATUS(riderId)),
        this.redis.get(REDIS_KEYS.RIDER_LAST_SEEN(riderId)),
      ]);

      if (status !== RiderStatus.ONLINE) continue;

      if (!lastSeen) {
        // Ghost: ONLINE with no lastSeen — evict immediately
        inactive.push(riderId);
        continue;
      }

      if (now - parseInt(lastSeen, 10) > thresholdMs) {
        inactive.push(riderId);
      }
    }

    return inactive;
  }

  async getRiderState(riderId: string): Promise<RiderState | null> {
    const pipeline = this.redis.pipeline();

    pipeline.get(REDIS_KEYS.RIDER_STATUS(riderId));
    pipeline.get(REDIS_KEYS.RIDER_HEX(riderId));
    pipeline.get(REDIS_KEYS.RIDER_LAST_SEEN(riderId));
    pipeline.get(REDIS_KEYS.RIDER_CURRENT_DELIVERY(riderId));
    pipeline.get(REDIS_KEYS.RIDER_PENDING_DELIVERY(riderId));
    pipeline.get(REDIS_KEYS.RIDER_LOCATION(riderId));

    const results = await pipeline.exec();
    if (!results) return null;

    const [status, hexId, lastSeen, currentJobId, pendingJobId, location] =
      results.map((r) => r[1]);

    // status is the only required field; role key does not exist for riders
    if (!status) return null;

    return {
      id: riderId,
      status: status as RiderStatus,
      role: 'RIDER' as DriverRole,
      hexId: hexId as string | null,
      lastSeen: lastSeen ? parseInt(lastSeen as string, 10) : 0,
      currentJobId: currentJobId as string | null,
      currentJobType: currentJobId ? JobType.DELIVERY : null,
      pendingJobId: pendingJobId as string | null,
      pendingJobType: pendingJobId ? JobType.DELIVERY : null,
      location: location ? JSON.parse(location as string) : null,
    };
  }

  async addRiderToGeoIndex(
    riderId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.redis.geoadd(REDIS_KEYS.RIDERS_GEO_INDEX, lng, lat, riderId);
  }

  async removeRiderFromGeoIndex(riderId: string): Promise<void> {
    await this.redis.zrem(REDIS_KEYS.RIDERS_GEO_INDEX, riderId);
  }

  async searchNearbyRiders(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<string[]> {
    return (await this.redis.georadius(
      REDIS_KEYS.RIDERS_GEO_INDEX,
      lng,
      lat,
      radiusKm,
      'km',
      'ASC',
    )) as string[];
  }

  // ========================================
  // ASSIGNMENT & LOCKS
  // ========================================

  async setPendingJob(
    driverId: string,
    jobId: string,
    jobType: JobType,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    pipeline.setex(
      REDIS_KEYS.DRIVER_PENDING_JOB(driverId),
      REDIS_TTL.PENDING_ASSIGNMENT,
      jobId,
    );
    pipeline.setex(
      REDIS_KEYS.DRIVER_PENDING_JOB_TYPE(driverId),
      REDIS_TTL.PENDING_ASSIGNMENT,
      jobType,
    );

    await pipeline.exec();
  }

  async clearPendingJob(driverId: string): Promise<void> {
    await this.redis.del(
      REDIS_KEYS.DRIVER_PENDING_JOB(driverId),
      REDIS_KEYS.DRIVER_PENDING_JOB_TYPE(driverId),
    );
  }

  async setAssignmentLock(
    jobType: string,
    jobId: string,
    driverId: string,
  ): Promise<boolean> {
    const result = await this.redis.set(
      REDIS_KEYS.LOCK_JOB_DRIVER(jobType, jobId, driverId),
      '1',
      'EX',
      REDIS_TTL.ASSIGNMENT_LOCK,
      'NX',
    );
    return result === 'OK';
  }

  async releaseAssignmentLock(
    jobType: string,
    jobId: string,
    driverId: string,
  ): Promise<void> {
    await this.redis.del(REDIS_KEYS.LOCK_JOB_DRIVER(jobType, jobId, driverId));
  }

  async setJobLock(jobId: string): Promise<boolean> {
    const result = await this.redis.set(
      REDIS_KEYS.LOCK_JOB(jobId),
      '1',
      'EX',
      REDIS_TTL.ASSIGNMENT_LOCK,
      'NX',
    );
    return result === 'OK';
  }

  async releaseJobLock(jobId: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.LOCK_JOB(jobId));
  }

  // ========================================
  // MATCHING METADATA
  // ========================================

  async incrementMatchingAttempts(jobId: string): Promise<number> {
    const key = REDIS_KEYS.MATCHING_ATTEMPTS(jobId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, REDIS_TTL.MATCHING_ATTEMPTS);
    return count;
  }

  async resetMatchingAttempts(jobId: string): Promise<void> {
    const key = REDIS_KEYS.MATCHING_ATTEMPTS(jobId);
    await this.redis.del(key);
  }

  async addDeclinedDriver(
    jobType: string,
    jobId: string,
    driverId: string,
  ): Promise<void> {
    const key = REDIS_KEYS.DECLINED_DRIVERS(jobType, jobId);
    await this.redis.sadd(key, driverId);
    await this.redis.expire(key, REDIS_TTL.DECLINED_DRIVERS);
  }

  /** BUG-3 fix: key format now matches Lua — matching:{jobType}:{jobId}:declined */
  async getDeclinedDrivers(jobType: string, jobId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.DECLINED_DRIVERS(jobType, jobId));
  }

  async hasDriverDeclined(
    jobType: string,
    jobId: string,
    driverId: string,
  ): Promise<boolean> {
    return (
      (await this.redis.sismember(
        REDIS_KEYS.DECLINED_DRIVERS(jobType, jobId),
        driverId,
      )) === 1
    );
  }

  // ========================================
  // GEOSPATIAL FALLBACK
  // ========================================

  async addDriverToGeoIndex(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.redis.geoadd(REDIS_KEYS.DRIVERS_GEO_INDEX, lng, lat, driverId);
  }

  async removeDriverFromGeoIndex(driverId: string): Promise<void> {
    await this.redis.zrem(REDIS_KEYS.DRIVERS_GEO_INDEX, driverId);
  }

  async searchNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<string[]> {
    return (await this.redis.georadius(
      REDIS_KEYS.DRIVERS_GEO_INDEX,
      lng,
      lat,
      radiusKm,
      'km',
      'ASC',
    )) as string[];
  }

  // ========================================
  // CLEANUP
  // ========================================

  async clearDriverState(driverId: string): Promise<void> {
    await this.redis.del(
      REDIS_KEYS.DRIVER_STATUS(driverId),
      REDIS_KEYS.DRIVER_ROLE(driverId),
      REDIS_KEYS.DRIVER_HEX(driverId),
      REDIS_KEYS.DRIVER_CURRENT_JOB(driverId),
      REDIS_KEYS.DRIVER_CURRENT_JOB_TYPE(driverId),
      REDIS_KEYS.DRIVER_PENDING_JOB(driverId),
      REDIS_KEYS.DRIVER_PENDING_JOB_TYPE(driverId),
      REDIS_KEYS.DRIVER_LOCATION(driverId),
      // Also delete the Lua-written type-specific job keys
      `driver:${driverId}:pendingRide`,
      `driver:${driverId}:pendingDelivery`,
      `driver:${driverId}:currentRide`,
      `driver:${driverId}:currentDelivery`,
    );
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      return false;
    }
  }

  // ========================================
  // BULK SCAN — LIVE MAP
  // ========================================

  // ========================================
  // ACTIVE SET MAINTENANCE  (BUG-6 fix)
  // ========================================

  /** Call after successfully setting a driver ONLINE. */
  async addToDriverActiveSet(driverId: string): Promise<void> {
    await this.redis.sadd(REDIS_KEYS.DRIVERS_ACTIVE_SET, driverId);
  }

  /** Call after setting a driver OFFLINE or evicting for inactivity. */
  async removeFromDriverActiveSet(driverId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.DRIVERS_ACTIVE_SET, driverId);
  }

  /** Call after successfully setting a rider ONLINE. */
  async addToRiderActiveSet(riderId: string): Promise<void> {
    await this.redis.sadd(REDIS_KEYS.RIDERS_ACTIVE_SET, riderId);
  }

  /** Call after setting a rider OFFLINE or evicting for inactivity. */
  async removeFromRiderActiveSet(riderId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.RIDERS_ACTIVE_SET, riderId);
  }

  // ========================================
  // BULK SCAN — LIVE MAP
  // ========================================

  /** Returns all driver states that have a known location (for the live map).
   *  BUG-6 fix: uses drivers:active SET instead of O(N) KEYS scan. */
  async getAllDriverStatesWithLocation(): Promise<DriverState[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.DRIVERS_ACTIVE_SET);
    if (!ids.length) return [];

    const states = await Promise.all(
      ids.map((id) => this.getDriverState(id).catch(() => null)),
    );

    return states.filter(
      (s): s is DriverState => s !== null && s.location !== null,
    );
  }

  /** Returns all rider states that have a known location (for the live map).
   *  BUG-6 fix: uses riders:active SET instead of O(N) KEYS scan. */
  async getAllRiderStatesWithLocation(): Promise<RiderState[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.RIDERS_ACTIVE_SET);
    if (!ids.length) return [];

    const states = await Promise.all(
      ids.map((id) => this.getRiderState(id).catch(() => null)),
    );

    return states.filter(
      (s): s is RiderState => s !== null && s.location !== null,
    );
  }

  /**
   * Returns driver states from the active set.
   * BUG-6 fix: uses drivers:active SET instead of O(N) KEYS scan.
   */
  async getAllDriverStates(): Promise<DriverState[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.DRIVERS_ACTIVE_SET);
    if (!ids.length) return [];

    const states = await Promise.all(
      ids.map((id) => this.getDriverState(id).catch(() => null)),
    );

    return states.filter((s): s is DriverState => s !== null);
  }

  /**
   * Returns rider states from the active set.
   * BUG-6 fix: uses riders:active SET instead of O(N) KEYS scan.
   */
  async getAllRiderStates(): Promise<RiderState[]> {
    const ids = await this.redis.smembers(REDIS_KEYS.RIDERS_ACTIVE_SET);
    if (!ids.length) return [];

    const states = await Promise.all(
      ids.map((id) => this.getRiderState(id).catch(() => null)),
    );

    return states.filter((s): s is RiderState => s !== null);
  }
}
