import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter'; // <--- Added for Task 4
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { DRIVER_EVENTS, DriverLocationUpdatedEvent } from '../events/event-types'; // <--- Added
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
    private readonly eventEmitter: EventEmitter2, // <--- Injected for Real-Time Updates
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

    this.eventBus.emitDriverOnline({ driverId, lat, lng, hexId, timestamp });
  }

  async setOffline(driverId: string, reason?: string): Promise<void> {
    const result = await this.redis
      .getClient()
      .eval(ATOMIC_SET_OFFLINE, 0, driverId);
    if (result === 0) throw new Error('Active job prevents offline');

    await this.redis.removeDriverFromGeoIndex(driverId);

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
    if (!this.geo.validateCoordinates(lat, lng)) return;

    const hexId = this.geo.latLngToHex(lat, lng);
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
    heading: number = 0, // <--- Added heading parameter
  ): Promise<void> {
    // Validate coordinates
    if (!this.geo.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }

    const newHexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

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

    if (result === -1) return;

    await this.redis.addDriverToGeoIndex(driverId, lat, lng);

    this.eventBus.emitDriverLocationUpdated({
      driverId,
      lat,
      lng,
      hexId,
      hexChanged: result === 1,
      timestamp,
    };

    // 1. Emit to System Event Bus (existing logic)
    this.eventBus.emitDriverLocationUpdated(eventPayload);

    // 2. Emit to Real-Time Socket Listener (FIX for Task 4)
    // This bridges the gap to the DriverLocationListener
    this.eventEmitter.emitAsync(DRIVER_EVENTS.LOCATION_UPDATED, eventPayload);
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
     QUERIES
  ============================================================ */
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