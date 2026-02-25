import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import {
  DriverStatus,
  REDIS_TTL,
  JobType,
} from '../redis/redis-keys.constants';
import {
  ATOMIC_UPDATE_LOCATION,
  ATOMIC_SET_ONLINE,
  ATOMIC_SET_OFFLINE,
  ATOMIC_COMPLETE_TRIP,
  ATOMIC_ACCEPT_TRIP,
  ATOMIC_DECLINE_TRIP,
} from '../redis/lua-scripts';

type RideJob = {
  jobId: string;
  jobType: 'ride';
};

@Injectable()
export class DriverStateService {
  private readonly logger = new Logger(DriverStateService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
  ) {}

  /* ============================================================
     INTERNAL GUARD
  ============================================================ */
  private assertRideJob(job: RideJob) {
    if (job.jobType !== 'ride') {
      throw new Error('Driver state only supports ride jobs');
    }
  }

  /* ============================================================
     DRIVER STATUS
  ============================================================ */
  async setOnline(driverId: string, lat: number, lng: number): Promise<void> {
    if (!this.geo.validateCoordinates(lat, lng))
      throw new Error('Invalid coordinates');
    if (!this.geo.isWithinServiceArea(lat, lng))
      throw new Error('Outside service area');

    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_ONLINE, 0, driverId, hexId);
    if (result !== 1) return;

    await this.redis
      .getClient()
      .set(`driver:${driverId}:location`, JSON.stringify({ lat, lng }));
    await this.redis.updateLastSeen(driverId);
    await this.redis.addDriverToGeoIndex(driverId, lat, lng);
    await this.redis.addToDriverActiveSet(driverId); // BUG-6

    this.eventBus.emitDriverOnline({ driverId, lat, lng, hexId, timestamp });
  }

  /**
   * Restore spatial state on server restart WITHOUT resetting lastSeen.
   * If no socket heartbeat follows within the inactivity window the
   * DriverInactivityProcessor will evict this driver to OFFLINE automatically.
   */
  async restoreOnline(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    if (!this.geo.validateCoordinates(lat, lng))
      throw new Error('Invalid coordinates');
    if (!this.geo.isWithinServiceArea(lat, lng))
      throw new Error('Outside service area');

    const hexId = this.geo.latLngToHex(lat, lng);

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_ONLINE, 0, driverId, hexId);
    if (result !== 1) return;

    await this.redis
      .getClient()
      .set(`driver:${driverId}:location`, JSON.stringify({ lat, lng }));
    // Deliberately NO updateLastSeen — inactivity processor evicts stale entries
    await this.redis.addDriverToGeoIndex(driverId, lat, lng);
    await this.redis.addToDriverActiveSet(driverId); // BUG-6
  }

  async setOffline(driverId: string, reason?: string): Promise<void> {
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_OFFLINE, 0, driverId);
    if (result === 0) throw new Error('Active job prevents offline');

    await this.redis.removeDriverFromGeoIndex(driverId);
    await this.redis.removeFromDriverActiveSet(driverId); // BUG-6

    this.eventBus.emitDriverOffline({
      driverId,
      reason,
      timestamp: Date.now(),
    });
  }

  /* ============================================================
     LOCATION UPDATES
  ============================================================ */
  async updateLocation(driverId: string, lat: number, lng: number) {
    if (!this.geo.validateCoordinates(lat, lng)) {
      this.logger.warn(
        `[LOC] Driver ${driverId}: invalid coordinates [${lat}, ${lng}] — skipped`,
      );
      return;
    }

    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    this.logger.debug(
      `[LOC] Driver ${driverId}: processing [${lat}, ${lng}] → hex ${hexId}`,
    );

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_UPDATE_LOCATION,
        0,
        driverId,
        lat.toString(),
        lng.toString(),
        hexId,
        timestamp.toString(),
      );

    if (result === -1) {
      this.logger.warn(
        `[LOC] Driver ${driverId}: SKIPPED — status is not ONLINE/ACTIVE (Lua returned -1)`,
      );
      return;
    }

    if (result === 0) {
      this.logger.debug(
        `[LOC] Driver ${driverId}: same hex ${hexId}, already in hex-set (or has pending job — not self-healed)`,
      );
    } else if (result === 1) {
      this.logger.debug(
        `[LOC] Driver ${driverId}: hex CHANGED → now in ${hexId} — hex-set updated`,
      );
    } else if (result === 2) {
      this.logger.warn(
        `[LOC] Driver ${driverId}: SELF-HEALED — was missing from hex-set ${hexId}, re-added`,
      );
    }

    await this.redis.addDriverToGeoIndex(driverId, lat, lng);
    this.logger.debug(`[LOC] Driver ${driverId}: geo-index updated`);

    this.eventBus.emitDriverLocationUpdated({
      driverId,
      lat,
      lng,
      hexId,
      hexChanged: result === 1,
      timestamp,
    });
  }

  /* ============================================================
     JOB ASSIGNMENT (RIDE ONLY)
  ============================================================ */
  async acceptJob(driverId: string, job: RideJob) {
    this.assertRideJob(job);

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_ACCEPT_TRIP, 0, driverId, JobType.RIDE, job.jobId);

    if (result === 0) throw new Error('No pending ride job');

    this.eventBus.emitJobUpdated({
      jobId: job.jobId,
      jobType: 'ride',
      status: 'accepted',
      driverId,
      timestamp: Date.now(),
    });
  }

  async declineJob(
    driverId: string,
    job: RideJob,
    reason?: string,
  ): Promise<void> {
    this.assertRideJob(job);

    const state = await this.redis.getDriverState(driverId);
    if (!state?.hexId) throw new Error('Driver state missing');

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_DECLINE_TRIP,
        0,
        driverId,
        JobType.RIDE,
        job.jobId,
        state.hexId,
        REDIS_TTL.DECLINED_DRIVERS.toString(),
      );

    if (result === 0) throw new Error('No pending ride job');

    this.eventBus.emitJobCancelled({
      jobId: job.jobId,
      jobType: 'ride',
      driverId,
      reason,
      cancelledBy: 'driver',
      timestamp: Date.now(),
    });
  }

  async handleAssignmentTimeout(driverId: string, job: RideJob) {
    this.assertRideJob(job);

    const state = await this.redis.getDriverState(driverId);
    if (!state?.hexId) return;

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_DECLINE_TRIP,
        0,
        driverId,
        JobType.RIDE,
        job.jobId,
        state.hexId,
        REDIS_TTL.DECLINED_DRIVERS.toString(),
      );

    if (result === 0) return;

    this.eventBus.emitJobUpdated({
      jobId: job.jobId,
      jobType: 'ride',
      status: 'timeout',
      driverId,
      timestamp: Date.now(),
    });
  }

  /* ============================================================
     JOB COMPLETION
  ============================================================ */
  async completeJob(driverId: string, job: RideJob): Promise<void> {
    this.assertRideJob(job);

    const state = await this.redis.getDriverState(driverId);
    if (!state?.hexId) throw new Error('Driver state missing');

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_COMPLETE_TRIP,
        0,
        driverId,
        JobType.RIDE,
        job.jobId,
        state.hexId,
      );

    if (result === 0) throw new Error('No active ride job');

    const timestamp = Date.now();

    // Emit job completion event
    this.eventBus.emitJobUpdated({
      jobId: job.jobId,
      jobType: 'ride',
      status: 'completed',
      driverId,
      timestamp,
    });

    // Emit driver available event
    this.eventBus.emitDriverAvailable({
      driverId,
      hexId: state.hexId,
      lat: state.location?.lat ?? 0,
      lng: state.location?.lng ?? 0,
      reason: 'job_completed',
      timestamp,
    });
  }

  /* ============================================================
     CANCEL / RELEASE
  ============================================================ */

  /**
   * Release a driver back to ONLINE after a ride is cancelled
   * (by the driver OR the customer while a driver is assigned).
   *
   * Uses the same ATOMIC_COMPLETE_TRIP Lua script to reset status → ONLINE
   * and re-add the driver to their hex set, WITHOUT emitting a 'completed'
   * job event so metrics are not skewed.
   */
  async releaseDriver(driverId: string, rideId: string): Promise<void> {
    const state = await this.redis.getDriverState(driverId);
    if (!state) {
      this.logger.warn(
        `[RELEASE] Driver ${driverId} has no Redis state — skipping Redis cleanup`,
      );
      return;
    }

    const hexId = state.hexId ?? '';

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_COMPLETE_TRIP, 0, driverId, JobType.RIDE, rideId, hexId);

    if (result === 0) {
      // Redis state already diverged (e.g. timeout processor already cleaned up).
      // Force-reset status so they can receive new matching jobs.
      this.logger.warn(
        `[RELEASE] ATOMIC_COMPLETE_TRIP returned 0 for driver ${driverId} / ride ${rideId} — forcing status to ONLINE`,
      );
      await this.redis.setDriverStatus(driverId, DriverStatus.ONLINE);
    }

    this.logger.log(
      `[RELEASE] Driver ${driverId} released from cancelled ride ${rideId}`,
    );

    // Emit driver.available so any active listeners can react (e.g. live map)
    this.eventBus.emitDriverAvailable({
      driverId,
      hexId,
      lat: state.location?.lat ?? 0,
      lng: state.location?.lng ?? 0,
      reason: 'job_cancelled',
      timestamp: Date.now(),
    });
  }

  /* ============================================================
     QUERIES
  ============================================================ */

  /**
   * Looks up which driver is currently locked/pending for a ride
   * (written by the matching processor immediately after ATOMIC_LOCK_DRIVER).
   * Returns null if no driver has been locked yet.
   */
  async getPendingDriverForRide(rideId: string): Promise<string | null> {
    const key = `ride:${rideId}:pendingDriver`;
    return this.redis.getClient().get(key);
  }

  async getState(driverId: string) {
    return this.redis.getDriverState(driverId);
  }

  async isDriverAvailable(driverId: string): Promise<boolean> {
    const state = await this.redis.getDriverState(driverId);
    if (!state) return false;

    return (
      state.status === DriverStatus.ONLINE &&
      !state.pendingJobId &&
      !state.currentJobId
    );
  }
}
