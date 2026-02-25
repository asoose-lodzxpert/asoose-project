import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';
import { RedisService } from '../../matching/redis/redis.service';
import { DRIVER_EVENTS } from '../../matching/events/event-types';
import type { DriverLocationUpdatedEvent } from '../../matching/events/event-types';

@Injectable()
export class DriverLocationListener {
  // Throttle logs to avoid spamming console on every ping
  private readonly logger = new Logger(DriverLocationListener.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(DRIVER_EVENTS.LOCATION_UPDATED)
  async handleDriverLocationUpdate(payload: DriverLocationUpdatedEvent) {
    try {
      // 1. Check if driver is in an active ride (Fast Redis Lookup)
      const activeRideId = await this.redis.getDriverActiveRide(
        payload.driverId,
      );

      if (!activeRideId) return; // Driver is idle, no need to broadcast to specific users

      // 2. Get the customer for this ride
      const customerId = await this.redis.getRideCustomer(activeRideId);

      if (customerId) {
        // 3. Emit Direct Socket Event
        // We only send to the specific customer, saving massive bandwidth
        this.gateway.server
          .to(`user_${customerId}`)
          .emit('DRIVER_LOCATION_UPDATE', {
            type: 'DRIVER_LOCATION_UPDATE',
            metadata: {
              lat: payload.lat,
              lng: payload.lng,
              heading: payload.heading ?? 0,
              rideId: activeRideId,
            },
          });
      }
    } catch (error) {
      // Suppress errors here to prevent crashing the event loop for a single failed ping
      // this.logger.error(error);
    }
  }
}
