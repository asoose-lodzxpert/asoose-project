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
    pipeline.get(REDIS_KEYS.DRIVER_CURRENT_JOB(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_CURRENT_JOB_TYPE(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_PENDING_JOB(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_PENDING_JOB_TYPE(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_LOCATION(driverId));

    const results = await pipeline.exec();
    if (!results) return null;

    const [
      status,
      role,
      hexId,
      lastSeen,
      currentJobId,
      currentJobType,
      pendingJobId,
      pendingJobType,
      location,
    ] = results.map((r) => r[1]);

    if (!status || !role) return null;

    return {
      id: driverId,
      role: role as DriverRole,
      status: status as DriverStatus,
      hexId: hexId as string | null,
      lastSeen: lastSeen ? parseInt(lastSeen as string, 10) : 0,
      currentJobId: currentJobId as string | null,
      currentJobType: currentJobType as JobType | null,
      pendingJobId: pendingJobId as string | null,
      pendingJobType: pendingJobType as JobType | null,
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

  async getInactiveDrivers(
    inactivityThreshold: number = REDIS_TTL.DRIVER_INACTIVITY,
  ): Promise<string[]> {
    const keys = await this.redis.keys('driver:*:status');

    const inactive: string[] = [];
    const now = Date.now();
    const thresholdMs = inactivityThreshold * 1000;

    for (const key of keys) {
      const driverId = key.split(':')[1];
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
    await this.redis.incr(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
  }

  async removeDriverFromHex(driverId: string, hexId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId), driverId);
    await this.redis.decr(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
  }

  async getDriversInHex(hexId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.HEX_AVAILABLE_DRIVERS(hexId));
  }

  async getHexDriverCount(hexId: string): Promise<number> {
    const count = await this.redis.get(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
    return count ? parseInt(count, 10) : 0;
  }

  // ========================================
  // RIDER STATE OPERATIONS
  // ========================================

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

    if (!status) return null;

    return {
      id: riderId,
      status: status as RiderStatus,
      hexId: hexId as string | null,
      lastSeen: lastSeen ? parseInt(lastSeen as string, 10) : 0,
      currentJobId: currentJobId as string | null,
      pendingJobId: pendingJobId as string | null,
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

  async setAssignmentLock(jobId: string, driverId: string): Promise<boolean> {
    const result = await this.redis.set(
      REDIS_KEYS.LOCK_JOB_DRIVER(jobId, driverId),
      '1',
      'EX',
      REDIS_TTL.ASSIGNMENT_LOCK,
      'NX',
    );
    return result === 'OK';
  }

  async releaseAssignmentLock(jobId: string, driverId: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.LOCK_JOB_DRIVER(jobId, driverId));
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

  async addDeclinedDriver(jobId: string, driverId: string): Promise<void> {
    const key = REDIS_KEYS.DECLINED_DRIVERS(jobId);
    await this.redis.sadd(key, driverId);
    await this.redis.expire(key, REDIS_TTL.DECLINED_DRIVERS);
  }

  async getDeclinedDrivers(jobId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.DECLINED_DRIVERS(jobId));
  }

  async hasDriverDeclined(jobId: string, driverId: string): Promise<boolean> {
    return (
      (await this.redis.sismember(
        REDIS_KEYS.DECLINED_DRIVERS(jobId),
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
}
