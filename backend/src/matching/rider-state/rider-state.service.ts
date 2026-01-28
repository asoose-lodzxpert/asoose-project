import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';

@Injectable()
export class RiderStateService {
  constructor(
    private readonly redis: RedisService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
  ) {}

  async setOnline(riderId: string, lat: number, lng: number): Promise<void> {
    if (!this.geo.validateCoordinates(lat, lng)) {
      throw new Error('Invalid coordinates');
    }
    if (!this.geo.isWithinServiceArea(lat, lng)) {
      throw new Error('Location outside service area');
    }
    const hexId = this.geo.latLngToHex(lat, lng);
    const timestamp = Date.now();
    await this.redis.getClient().set(`rider:${riderId}:status`, 'ONLINE');
    await this.redis
      .getClient()
      .set(`rider:${riderId}:location`, JSON.stringify({ lat, lng }));
    await this.redis.updateLastSeen(riderId);
    await this.redis.addDriverToGeoIndex(riderId, lat, lng);
    this.eventBus.emit('rider.online', { riderId, lat, lng, hexId, timestamp });
  }

  async setOffline(riderId: string, reason?: string): Promise<void> {
    await this.redis.getClient().set(`rider:${riderId}:status`, 'OFFLINE');
    await this.redis.removeDriverFromGeoIndex(riderId);
    this.eventBus.emit('rider.offline', {
      riderId,
      reason,
      timestamp: Date.now(),
    });
  }
}
