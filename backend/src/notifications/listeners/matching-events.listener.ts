import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';
// Split the import: Use 'import type' for the interface
import { RIDE_EVENTS } from '../../matching/events/event-types';
import type { RideNoDriverFoundEvent } from '../../matching/events/event-types'; 

@Injectable()
export class MatchingEventsListener {
  private readonly logger = new Logger(MatchingEventsListener.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  @OnEvent(RIDE_EVENTS.NO_DRIVER_FOUND)
  handleNoDriverFound(payload: RideNoDriverFoundEvent) {
    this.logger.log(`Emitting NO_DRIVERS_FOUND for ride ${payload.rideId}`);

    this.gateway.server
      .to(`user_${payload.customerId}`)
      .emit('NO_DRIVERS_FOUND', {
        type: 'NO_DRIVERS_FOUND',
        metadata: {
          rideId: payload.rideId,
          message: 'No drivers were found in your area. Please try again.',
        },
      });
  }
}