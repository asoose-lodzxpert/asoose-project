import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from '../notifications.gateway';

@Injectable()
export class MatchingEventsListener {
  private readonly logger = new Logger(MatchingEventsListener.name);

  constructor(private readonly gateway: NotificationsGateway) {}

  @OnEvent('no_driver_found')
  handleNoDriverFound(payload: { rideId: string; customerId: string }) {
    this.logger.log(`Emitting NO_DRIVERS_FOUND for ride ${payload.rideId}`);

    this.gateway.server
      .to(`user_${payload.customerId}`)
      .emit('NO_DRIVERS_FOUND', {
        type: 'NO_DRIVERS_FOUND',
        rideId: payload.rideId,
        reason: 'No drivers were found in your area. Please try again.',
      });
  }
}
