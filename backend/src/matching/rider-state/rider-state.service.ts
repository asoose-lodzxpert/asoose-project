import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { REDIS_TTL, JobType } from '../redis/redis-keys.constants';
import {
  ATOMIC_ASSIGN_DELIVERY,
  ATOMIC_DECLINE_DELIVERY,
  ATOMIC_COMPLETE_DELIVERY,
  ATOMIC_UPDATE_RIDER_LOCATION,
} from '../redis/lua-scripts';

export type RiderStatus = 'ONLINE' | 'OFFLINE';

export interface DeliveryJob {
  jobId: string;
  jobType: 'delivery';
}

@Injectable()
export class RiderStateService {
  private readonly logger = new Logger(RiderStateService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
  ) {}

  // ========================================
  // INTERNAL GUARDS
  // ========================================
  private assertDeliveryJob(job: DeliveryJob) {
    if (job.jobType !== 'delivery') {
      throw new Error('Rider state only supports delivery jobs');
    }
  }

  // ========================================
  // RIDER STATUS
  // ========================================
  async setOnline(riderId: string, lat: number, lng: number): Promise<void> {
    if (!this.geo.validateCoordinates(lat, lng))
      throw new Error('Invalid coordinates');
    if (!this.geo.isWithinServiceArea(lat, lng))
      throw new Error('Outside service area');

    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    // Set status, location, hex and add to hex-set atomically
    const client = this.redis.getClient();
    await client.set(`rider:${riderId}:status`, 'ONLINE');
    await client.set(`rider:${riderId}:location`, JSON.stringify({ lat, lng }));
    await client.set(`rider:${riderId}:hex`, hexId);
    await client.sadd(`hex:${hexId}:riders`, riderId);
    await this.redis.updateLastSeen(riderId);
    await this.redis.addRiderToGeoIndex(riderId, lat, lng);

    this.eventBus.emit('rider.online', { riderId, lat, lng, hexId, timestamp });
    this.logger.log(
      `Rider online: ${riderId} at [${lat}, ${lng}] hex=${hexId}`,
    );
  }

  async setOffline(riderId: string, reason?: string): Promise<void> {
    const timestamp = Date.now();
    await this.redis.getClient().set(`rider:${riderId}:status`, 'OFFLINE');
    await this.redis.removeRiderFromGeoIndex(riderId);

    this.eventBus.emit('rider.offline', { riderId, reason, timestamp });
    this.logger.log(`Rider offline: ${riderId} (${reason ?? 'no reason'})`);
  }

  // ========================================
  // LOCATION UPDATES
  // ========================================
  async updateLocation(riderId: string, lat: number, lng: number) {
    if (!this.geo.validateCoordinates(lat, lng)) return;

    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_UPDATE_RIDER_LOCATION,
        0,
        riderId,
        lat.toString(),
        lng.toString(),
        hexId,
        timestamp.toString(),
      );

    if (result === -1) {
      this.logger.warn(
        `[LOC] Rider ${riderId}: SKIPPED — status is not ONLINE (Lua returned -1)`,
      );
      return;
    }

    if (result === 1) {
      this.logger.debug(
        `[LOC] Rider ${riderId}: hex CHANGED → now in ${hexId} — hex-set updated`,
      );
    } else if (result === 2) {
      this.logger.warn(
        `[LOC] Rider ${riderId}: SELF-HEALED — was missing from hex-set ${hexId}, re-added`,
      );
    }

    await this.redis.addRiderToGeoIndex(riderId, lat, lng);

    this.eventBus.emit('rider.location.updated', {
      riderId,
      lat,
      lng,
      hexId,
      timestamp,
    });
    this.logger.debug(
      `Rider location updated: ${riderId} -> [${lat}, ${lng}] hex=${hexId}`,
    );
  }

  // ========================================
  // JOB ASSIGNMENT (DELIVERY ONLY)
  // ========================================
  async acceptJob(riderId: string, job: DeliveryJob) {
    this.assertDeliveryJob(job);

    const result = await this.redis
      .getClient()
      .eval(ATOMIC_ASSIGN_DELIVERY, 0, riderId, JobType.DELIVERY, job.jobId);

    if (result === 0) throw new Error('No pending delivery job');

    this.eventBus.emit('job.updated', {
      jobId: job.jobId,
      jobType: 'delivery',
      status: 'accepted',
      riderId,
      timestamp: Date.now(),
    });
    this.logger.log(`Rider ${riderId} accepted delivery ${job.jobId}`);
  }

  async declineJob(riderId: string, job: DeliveryJob, reason?: string) {
    this.assertDeliveryJob(job);

    const state = await this.redis.getRiderState(riderId);
    if (!state?.hexId) throw new Error('Rider state missing');

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_DECLINE_DELIVERY,
        0,
        riderId,
        JobType.DELIVERY,
        job.jobId,
        state.hexId,
        REDIS_TTL.DECLINED_DRIVERS.toString(),
      );

    if (result === 0) throw new Error('No pending delivery job');

    this.eventBus.emit('job.cancelled', {
      jobId: job.jobId,
      jobType: 'delivery',
      riderId,
      reason,
      timestamp: Date.now(),
    });
    this.logger.log(
      `Rider ${riderId} declined delivery ${job.jobId} (${reason ?? 'no reason'})`,
    );
  }

  async completeJob(riderId: string, job: DeliveryJob) {
    this.assertDeliveryJob(job);

    const state = await this.redis.getRiderState(riderId);
    if (!state?.hexId) throw new Error('Rider state missing');

    const result = await this.redis
      .getClient()
      .eval(
        ATOMIC_COMPLETE_DELIVERY,
        0,
        riderId,
        JobType.DELIVERY,
        job.jobId,
        state.hexId,
      );

    if (result === 0) throw new Error('No active delivery job');

    const timestamp = Date.now();

    this.eventBus.emit('job.updated', {
      jobId: job.jobId,
      jobType: 'delivery',
      status: 'completed',
      riderId,
      timestamp,
    });

    this.eventBus.emit('rider.available', {
      riderId,
      hexId: state.hexId,
      lat: state.location?.lat ?? 0,
      lng: state.location?.lng ?? 0,
      reason: 'job_completed',
      timestamp,
    });

    this.logger.log(`Rider ${riderId} completed delivery ${job.jobId}`);
  }

  // ========================================
  // QUERY
  // ========================================
  async isRiderAvailable(riderId: string): Promise<boolean> {
    const state = await this.redis.getRiderState(riderId);
    if (!state) return false;

    return (
      state.status === 'ONLINE' && !state.pendingJobId && !state.currentJobId
    );
  }

  async getRealtimeStatus(riderId: string): Promise<'ONLINE' | 'OFFLINE'> {
    const status = await this.redis.getClient().get(`rider:${riderId}:status`);
    // Default to OFFLINE if not found in Redis
    return (status as 'ONLINE' | 'OFFLINE') || 'OFFLINE';
  }
}
