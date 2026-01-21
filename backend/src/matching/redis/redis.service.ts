import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { MATCHING_REDIS_CLIENT } from './redis.module';
import {
  REDIS_KEYS,
  REDIS_TTL,
  DriverStatus,
  DriverState,
} from './redis-keys.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(MATCHING_REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Get Redis client for custom operations
   */
  getClient(): Redis {
    return this.redis;
  }

  // ========================================
  // DRIVER STATE OPERATIONS
  // ========================================

  /**
   * Get complete driver state from Redis
   */
  async getDriverState(driverId: string): Promise<DriverState | null> {
    const pipeline = this.redis.pipeline();

    pipeline.get(REDIS_KEYS.DRIVER_STATUS(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_HEX(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_LAST_SEEN(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_CURRENT_RIDE(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_CURRENT_DELIVERY(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_PENDING_RIDE(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_PENDING_DELIVERY(driverId));
    pipeline.get(REDIS_KEYS.DRIVER_LOCATION(driverId));

    const results = await pipeline.exec();

    if (!results) return null;

    const [
      status,
      hexId,
      lastSeen,
      currentRide,
      currentDelivery,
      pendingRide,
      pendingDelivery,
      location,
    ] = results.map((r) => r[1]);

    if (!status) return null;

    return {
      id: driverId,
      status: status as DriverStatus,
      hexId: hexId as string | null,
      lastSeen: lastSeen ? parseInt(lastSeen as string) : 0,
      currentRide: currentRide as string | null,
      currentDelivery: currentDelivery as string | null,
      pendingRide: pendingRide as string | null,
      pendingDelivery: pendingDelivery as string | null,
      location: location ? JSON.parse(location as string) : null,
    };
  }

  /**
   * Set driver status (OFFLINE | ONLINE | ACTIVE)
   */
  async setDriverStatus(driverId: string, status: DriverStatus): Promise<void> {
    await this.redis.set(REDIS_KEYS.DRIVER_STATUS(driverId), status);
  }

  /**
   * Get driver status
   */
  async getDriverStatus(driverId: string): Promise<DriverStatus | null> {
    const status = await this.redis.get(REDIS_KEYS.DRIVER_STATUS(driverId));
    return status as DriverStatus | null;
  }

  /**
   * Update driver's last seen timestamp
   */
  async updateLastSeen(driverId: string): Promise<void> {
    await this.redis.set(
      REDIS_KEYS.DRIVER_LAST_SEEN(driverId),
      Date.now().toString(),
    );
  }

  /**
   * Get drivers who haven't sent heartbeat recently
   */
  async getInactiveDrivers(
    inactivityThreshold: number = REDIS_TTL.DRIVER_INACTIVITY,
  ): Promise<string[]> {
    const pattern = REDIS_KEYS.DRIVER_STATUS('*').replace('*', '*');
    const keys = await this.redis.keys(pattern);

    const inactiveDrivers: string[] = [];
    const now = Date.now();
    const thresholdMs = inactivityThreshold * 1000;

    for (const key of keys) {
      const driverId = key.split(':')[1];
      const lastSeen = await this.redis.get(
        REDIS_KEYS.DRIVER_LAST_SEEN(driverId),
      );
      const status = await this.redis.get(REDIS_KEYS.DRIVER_STATUS(driverId));

      if (lastSeen && status === DriverStatus.ONLINE) {
        const lastSeenTime = parseInt(lastSeen);
        if (now - lastSeenTime > thresholdMs) {
          inactiveDrivers.push(driverId);
        }
      }
    }

    return inactiveDrivers;
  }

  // ========================================
  // HEX INDEX OPERATIONS
  // ========================================

  /**
   * Add driver to hex index (only if ONLINE and not ACTIVE/pending)
   */
  async addDriverToHex(driverId: string, hexId: string): Promise<void> {
    await this.redis.sadd(REDIS_KEYS.HEX_DRIVERS(hexId), driverId);
    await this.redis.incr(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
  }

  /**
   * Remove driver from hex index
   */
  async removeDriverFromHex(driverId: string, hexId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.HEX_DRIVERS(hexId), driverId);
    await this.redis.decr(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
  }

  /**
   * Get all driver IDs in a hex
   */
  async getDriversInHex(hexId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.HEX_DRIVERS(hexId));
  }

  /**
   * Get driver count in hex
   */
  async getHexDriverCount(hexId: string): Promise<number> {
    const count = await this.redis.get(REDIS_KEYS.HEX_DRIVER_COUNT(hexId));
    return count ? parseInt(count) : 0;
  }

  // ========================================
  // ASSIGNMENT LOCKS
  // ========================================

  /**
   * Set pending assignment with TTL
   */
  async setPendingAssignment(
    driverId: string,
    tripType: 'ride' | 'delivery',
    tripId: string,
  ): Promise<void> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.DRIVER_PENDING_RIDE(driverId)
        : REDIS_KEYS.DRIVER_PENDING_DELIVERY(driverId);

    await this.redis.setex(key, REDIS_TTL.PENDING_ASSIGNMENT, tripId);
  }

  /**
   * Clear pending assignment
   */
  async clearPendingAssignment(
    driverId: string,
    tripType: 'ride' | 'delivery',
  ): Promise<void> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.DRIVER_PENDING_RIDE(driverId)
        : REDIS_KEYS.DRIVER_PENDING_DELIVERY(driverId);

    await this.redis.del(key);
  }

  /**
   * Set assignment lock
   */
  async setAssignmentLock(
    tripType: 'ride' | 'delivery',
    tripId: string,
    driverId: string,
  ): Promise<boolean> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.LOCK_RIDE_DRIVER(tripId, driverId)
        : REDIS_KEYS.LOCK_DELIVERY_DRIVER(tripId, driverId);

    const result = await this.redis.set(
      key,
      '1',
      'EX',
      REDIS_TTL.ASSIGNMENT_LOCK,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release assignment lock
   */
  async releaseAssignmentLock(
    tripType: 'ride' | 'delivery',
    tripId: string,
    driverId: string,
  ): Promise<void> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.LOCK_RIDE_DRIVER(tripId, driverId)
        : REDIS_KEYS.LOCK_DELIVERY_DRIVER(tripId, driverId);

    await this.redis.del(key);
  }

  /**
   * Set global trip lock to prevent concurrent matching
   */
  async setTripLock(
    tripType: 'ride' | 'delivery',
    tripId: string,
  ): Promise<boolean> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.LOCK_RIDE(tripId)
        : REDIS_KEYS.LOCK_DELIVERY(tripId);

    const result = await this.redis.set(
      key,
      '1',
      'EX',
      REDIS_TTL.ASSIGNMENT_LOCK,
      'NX',
    );
    return result === 'OK';
  }

  /**
   * Release global trip lock
   */
  async releaseTripLock(
    tripType: 'ride' | 'delivery',
    tripId: string,
  ): Promise<void> {
    const key =
      tripType === 'ride'
        ? REDIS_KEYS.LOCK_RIDE(tripId)
        : REDIS_KEYS.LOCK_DELIVERY(tripId);

    await this.redis.del(key);
  }

  // ========================================
  // MATCHING METADATA
  // ========================================

  /**
   * Increment matching attempts counter
   */
  async incrementMatchingAttempts(
    tripType: 'ride' | 'delivery',
    tripId: string,
  ): Promise<number> {
    const key = REDIS_KEYS.MATCHING_ATTEMPTS(tripType, tripId);
    const count = await this.redis.incr(key);
    await this.redis.expire(key, REDIS_TTL.MATCHING_ATTEMPTS);
    return count;
  }

  /**
   * Add driver to declined list
   */
  async addDeclinedDriver(
    tripType: 'ride' | 'delivery',
    tripId: string,
    driverId: string,
  ): Promise<void> {
    const key = REDIS_KEYS.DECLINED_DRIVERS(tripType, tripId);
    await this.redis.sadd(key, driverId);
    await this.redis.expire(key, REDIS_TTL.DECLINED_DRIVERS);
  }

  /**
   * Get all declined drivers for a trip
   */
  async getDeclinedDrivers(
    tripType: 'ride' | 'delivery',
    tripId: string,
  ): Promise<string[]> {
    const key = REDIS_KEYS.DECLINED_DRIVERS(tripType, tripId);
    return this.redis.smembers(key);
  }

  /**
   * Check if driver has declined this trip
   */
  async hasDriverDeclined(
    tripType: 'ride' | 'delivery',
    tripId: string,
    driverId: string,
  ): Promise<boolean> {
    const key = REDIS_KEYS.DECLINED_DRIVERS(tripType, tripId);
    return (await this.redis.sismember(key, driverId)) === 1;
  }

  // ========================================
  // GEOSPATIAL OPERATIONS (FALLBACK)
  // ========================================

  /**
   * Add driver to geospatial index
   */
  async addDriverToGeoIndex(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.redis.geoadd(REDIS_KEYS.DRIVERS_GEO_INDEX, lng, lat, driverId);
  }

  /**
   * Remove driver from geospatial index
   */
  async removeDriverFromGeoIndex(driverId: string): Promise<void> {
    await this.redis.zrem(REDIS_KEYS.DRIVERS_GEO_INDEX, driverId);
  }

  /**
   * Search nearby drivers using Redis GEORADIUS (fallback)
   */
  async searchNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<string[]> {
    const results = await this.redis.georadius(
      REDIS_KEYS.DRIVERS_GEO_INDEX,
      lng,
      lat,
      radiusKm,
      'km',
      'ASC',
    );
    return results as string[];
  }

  // ========================================
  // CLEANUP OPERATIONS
  // ========================================

  /**
   * Clear all driver state (use when driver goes offline)
   */
  async clearDriverState(driverId: string): Promise<void> {
    const pipeline = this.redis.pipeline();

    pipeline.del(REDIS_KEYS.DRIVER_STATUS(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_HEX(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_CURRENT_RIDE(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_CURRENT_DELIVERY(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_PENDING_RIDE(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_PENDING_DELIVERY(driverId));
    pipeline.del(REDIS_KEYS.DRIVER_LOCATION(driverId));

    await pipeline.exec();
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      return false;
    }
  }
}
