import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import {
  DriverStatus,
  REDIS_TTL,
  TripType,
} from '../redis/redis-keys.constants';
import {
  ATOMIC_UPDATE_LOCATION,
  ATOMIC_SET_ONLINE,
  ATOMIC_SET_OFFLINE,
  ATOMIC_COMPLETE_TRIP,
  ATOMIC_ACCEPT_TRIP,
  ATOMIC_DECLINE_TRIP,
} from '../redis/lua-scripts';

/**
 * Driver State Management Service
 *
 * Manages all driver state transitions in Redis.
 * ALL driver status, location, and active trip data lives here - NOT in the database.
 */
@Injectable()
export class DriverStateService {
  private readonly logger = new Logger(DriverStateService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
  ) {}

  // ========================================
  // DRIVER STATUS TRANSITIONS
  // ========================================

  /**
   * Set driver online
   *
   * Atomically sets driver to ONLINE and adds to hex index.
   */
  async setOnline(driverId: string, lat: number, lng: number): Promise<void> {
    // Validate coordinates
    if (!this.geo.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    // Check service area
    if (!this.geo.isWithinServiceArea(lat, lng)) {
      throw new Error('Location outside service area');
    }

    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    // Execute atomic script
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_ONLINE, 0, driverId, hexId);

    if (result === 1) {
      // Update location and last seen
      await Promise.all([
        this.redis
          .getClient()
          .set(`driver:${driverId}:location`, JSON.stringify({ lat, lng })),
        this.redis.updateLastSeen(driverId),
      ]);

      // Add to geo index (fallback)
      await this.redis.addDriverToGeoIndex(driverId, lat, lng);

      this.logger.log(`✅ Driver ${driverId} is now ONLINE at hex ${hexId}`);

      // Emit event
      this.eventBus.emitDriverOnline({
        driverId,
        lat,
        lng,
        hexId,
        timestamp,
      });
    }
  }

  /**
   * Set driver offline
   *
   * Atomically sets driver to OFFLINE and removes from all indexes.
   * Fails if driver has active trip.
   */
  async setOffline(driverId: string, reason?: string): Promise<void> {
    // Execute atomic script
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_OFFLINE, 0, driverId);

    if (result === 0) {
      throw new Error('Cannot go offline: driver has active trip');
    }

    // Remove from geo index
    await this.redis.removeDriverFromGeoIndex(driverId);

    this.logger.log(`✅ Driver ${driverId} is now OFFLINE`);

    // Emit event
    this.eventBus.emitDriverOffline({
      driverId,
      reason,
      timestamp: Date.now(),
    });
  }

  // ========================================
  // LOCATION UPDATES
  // ========================================

  /**
   * Update driver location (heartbeat)
   *
   * Atomically updates location, hex, and moves between hex indexes if needed.
   * This is called frequently by the driver app (every 5-10 seconds).
   */
  async updateLocation(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    // Validate coordinates
    if (!this.geo.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    const newHexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    // Execute atomic script
    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_UPDATE_LOCATION,
        0,
        driverId,
        lat.toString(),
        lng.toString(),
        newHexId,
        timestamp.toString(),
      );

    if (result === -1) {
      // Driver not online - ignore silently or throw error
      this.logger.warn(
        `Driver ${driverId} location update rejected: not online`,
      );
      return;
    }

    // Update geo index
    await this.redis.addDriverToGeoIndex(driverId, lat, lng);

    const hexChanged = result === 1;
    const oldHexId = hexChanged ? undefined : newHexId;

    this.logger.debug(
      `📍 Driver ${driverId} location updated (hex: ${newHexId}, changed: ${hexChanged})`,
    );

    // Emit event
    this.eventBus.emitDriverLocationUpdated({
      driverId,
      lat,
      lng,
      hexId: newHexId,
      oldHexId,
      hexChanged,
      timestamp,
    });
  }

  // ========================================
  // TRIP ASSIGNMENT
  // ========================================

  /**
   * Accept trip assignment
   *
   * Atomically transitions driver from pending assignment to ACTIVE.
   */
  async acceptTrip(
    driverId: string,
    tripType: TripType,
    tripId: string,
  ): Promise<void> {
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_ACCEPT_TRIP, 0, driverId, tripType, tripId);

    if (result === 0) {
      throw new Error('No pending assignment or trip mismatch');
    }

    this.logger.log(`✅ Driver ${driverId} accepted ${tripType} ${tripId}`);

    // Emit event
    if (tripType === TripType.RIDE) {
      this.eventBus.emitRideAccepted({
        rideId: tripId,
        driverId,
        customerId: '', // Will be filled by caller
        acceptedAt: Date.now(),
      });
    } else {
      this.eventBus.emitDeliveryAccepted({
        deliveryId: tripId,
        driverId,
        customerId: '',
        acceptedAt: Date.now(),
      });
    }
  }

  /**
   * Decline trip assignment
   *
   * Atomically reverts driver to ONLINE and re-adds to hex index.
   * Adds driver to declined list for this trip.
   */
  async declineTrip(
    driverId: string,
    tripType: TripType,
    tripId: string,
    reason?: string,
  ): Promise<void> {
    const state = await this.redis.getDriverState(driverId);
    if (!state || !state.hexId) {
      throw new Error('Driver state not found');
    }

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_DECLINE_TRIP,
        0,
        driverId,
        tripType,
        tripId,
        state.hexId,
        REDIS_TTL.DECLINED_DRIVERS.toString(),
      );

    if (result === 0) {
      throw new Error('No pending assignment or trip mismatch');
    }

    this.logger.log(`❌ Driver ${driverId} declined ${tripType} ${tripId}`);

    // Emit event
    if (tripType === TripType.RIDE) {
      this.eventBus.emitRideDeclined({
        rideId: tripId,
        driverId,
        reason,
        declinedAt: Date.now(),
      });
    } else {
      this.eventBus.emitDeliveryDeclined({
        deliveryId: tripId,
        driverId,
        reason,
        declinedAt: Date.now(),
      });
    }
  }

  /**
   * Handle assignment timeout
   *
   * Same as decline, but triggered by timeout job.
   */
  async handleAssignmentTimeout(
    driverId: string,
    tripType: TripType,
    tripId: string,
  ): Promise<void> {
    const state = await this.redis.getDriverState(driverId);
    if (!state || !state.hexId) {
      this.logger.warn(
        `Cannot timeout ${tripType} ${tripId}: driver ${driverId} state not found`,
      );
      return;
    }

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_DECLINE_TRIP,
        0,
        driverId,
        tripType,
        tripId,
        state.hexId,
        REDIS_TTL.DECLINED_DRIVERS.toString(),
      );

    if (result === 0) {
      // Assignment already handled (accepted or declined)
      this.logger.debug(
        `Timeout ignored: ${tripType} ${tripId} already handled`,
      );
      return;
    }

    this.logger.warn(
      `⏱️  Driver ${driverId} assignment timeout for ${tripType} ${tripId}`,
    );

    // Emit timeout event
    if (tripType === TripType.RIDE) {
      this.eventBus.emitRideTimeout({
        rideId: tripId,
        driverId,
        timeoutAt: Date.now(),
      });
    } else {
      this.eventBus.emitDeliveryTimeout({
        deliveryId: tripId,
        driverId,
        timeoutAt: Date.now(),
      });
    }
  }

  // ========================================
  // TRIP COMPLETION
  // ========================================

  /**
   * Complete trip
   *
   * Atomically sets driver back to ONLINE and re-adds to hex index.
   */
  async completeTrip(
    driverId: string,
    tripType: TripType,
    tripId: string,
  ): Promise<void> {
    const state = await this.redis.getDriverState(driverId);
    if (!state || !state.hexId) {
      throw new Error('Driver state not found');
    }

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_COMPLETE_TRIP, 0, driverId, tripType, tripId, state.hexId);

    if (result === 0) {
      throw new Error('No active trip or trip mismatch');
    }

    this.logger.log(`✅ Driver ${driverId} completed ${tripType} ${tripId}`);

    // Emit driver available event
    this.eventBus.emitDriverAvailable({
      driverId,
      hexId: state.hexId,
      lat: state.location?.lat || 0,
      lng: state.location?.lng || 0,
      reason: 'trip_completed',
      timestamp: Date.now(),
    });
  }

  /**
   * Cancel trip (make driver available again)
   */
  async cancelTrip(
    driverId: string,
    tripType: TripType,
    tripId: string,
  ): Promise<void> {
    // Same as complete trip for driver state
    await this.completeTrip(driverId, tripType, tripId);
  }

  // ========================================
  // STATE QUERIES
  // ========================================

  /**
   * Get driver current state
   */
  async getDriverState(driverId: string) {
    return this.redis.getDriverState(driverId);
  }

  /**
   * Get driver status
   */
  async getDriverStatus(driverId: string): Promise<DriverStatus | null> {
    return this.redis.getDriverStatus(driverId);
  }

  /**
   * Check if driver is available for matching
   *
   * Driver is available if:
   * - Status is ONLINE
   * - No pending assignments
   * - No active trips
   */
  async isDriverAvailable(driverId: string): Promise<boolean> {
    const state = await this.redis.getDriverState(driverId);

    if (!state) return false;
    if (state.status !== DriverStatus.ONLINE) return false;
    if (state.pendingRide || state.pendingDelivery) return false;
    if (state.currentRide || state.currentDelivery) return false;

    return true;
  }

  /**
   * Get all drivers in a hex
   */
  async getDriversInHex(hexId: string): Promise<string[]> {
    return this.redis.getDriversInHex(hexId);
  }

  /**
   * Get driver count in hex
   */
  async getHexDriverCount(hexId: string): Promise<number> {
    return this.redis.getHexDriverCount(hexId);
  }
}
