import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RIDE_EVENTS,
  DELIVERY_EVENTS,
  DRIVER_EVENTS,
  NOTIFICATION_EVENTS,
  RideEvent,
  DeliveryEvent,
  DriverEvent,
  NotificationEvent,
} from './event-types';

/**
 * Event Bus Service
 *
 * Central event emitter for the matching system.
 * All events are emitted through this service for consistency and logging.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ========================================
  // RIDE EVENTS
  // ========================================

  emitRideRequested(event: RideEvent) {
    this.logger.log(`[RIDE] Requested: ${(event as any).rideId}`);
    this.eventEmitter.emit(RIDE_EVENTS.REQUESTED, event);
  }

  emitRideAssignmentRequested(event: RideEvent) {
    this.logger.log(
      `[RIDE] Assignment requested: ${(event as any).rideId} -> Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.ASSIGNMENT_REQUESTED, event);
  }

  emitRideAssigned(event: RideEvent) {
    this.logger.log(
      `[RIDE] Assigned: ${(event as any).rideId} -> Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.ASSIGNED, event);
  }

  emitRideAccepted(event: RideEvent) {
    this.logger.log(
      `[RIDE] Accepted: ${(event as any).rideId} by Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.ACCEPTED, event);
  }

  emitRideDeclined(event: RideEvent) {
    this.logger.log(
      `[RIDE] Declined: ${(event as any).rideId} by Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.DECLINED, event);
  }

  emitRideTimeout(event: RideEvent) {
    this.logger.log(
      `[RIDE] Timeout: ${(event as any).rideId} for Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.TIMEOUT, event);
  }

  emitRideStarted(event: RideEvent) {
    this.logger.log(`[RIDE] Started: ${(event as any).rideId}`);
    this.eventEmitter.emit(RIDE_EVENTS.STARTED, event);
  }

  emitRideCompleted(event: RideEvent) {
    this.logger.log(`[RIDE] Completed: ${(event as any).rideId}`);
    this.eventEmitter.emit(RIDE_EVENTS.COMPLETED, event);
  }

  emitRideCancelled(event: RideEvent) {
    this.logger.log(
      `[RIDE] Cancelled: ${(event as any).rideId} by ${(event as any).cancelledBy}`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.CANCELLED, event);
  }

  emitRideNoDriverFound(event: RideEvent) {
    this.logger.warn(
      `[RIDE] No driver found: ${(event as any).rideId} after ${(event as any).attempts} attempts`,
    );
    this.eventEmitter.emit(RIDE_EVENTS.NO_DRIVER_FOUND, event);
  }

  // ========================================
  // DELIVERY EVENTS
  // ========================================

  emitDeliveryRequested(event: DeliveryEvent) {
    this.logger.log(`[DELIVERY] Requested: ${(event as any).deliveryId}`);
    this.eventEmitter.emit(DELIVERY_EVENTS.REQUESTED, event);
  }

  emitDeliveryAssignmentRequested(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Assignment requested: ${(event as any).deliveryId} -> Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.ASSIGNMENT_REQUESTED, event);
  }

  emitDeliveryAssigned(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Assigned: ${(event as any).deliveryId} -> Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.ASSIGNED, event);
  }

  emitDeliveryAccepted(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Accepted: ${(event as any).deliveryId} by Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.ACCEPTED, event);
  }

  emitDeliveryDeclined(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Declined: ${(event as any).deliveryId} by Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.DECLINED, event);
  }

  emitDeliveryTimeout(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Timeout: ${(event as any).deliveryId} for Driver ${(event as any).driverId}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.TIMEOUT, event);
  }

  emitDeliveryPickedUp(event: DeliveryEvent) {
    this.logger.log(`[DELIVERY] Picked up: ${(event as any).deliveryId}`);
    this.eventEmitter.emit(DELIVERY_EVENTS.PICKED_UP, event);
  }

  emitDeliveryDelivered(event: DeliveryEvent) {
    this.logger.log(`[DELIVERY] Delivered: ${(event as any).deliveryId}`);
    this.eventEmitter.emit(DELIVERY_EVENTS.DELIVERED, event);
  }

  emitDeliveryCancelled(event: DeliveryEvent) {
    this.logger.log(
      `[DELIVERY] Cancelled: ${(event as any).deliveryId} by ${(event as any).cancelledBy}`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.CANCELLED, event);
  }

  emitDeliveryNoDriverFound(event: DeliveryEvent) {
    this.logger.warn(
      `[DELIVERY] No driver found: ${(event as any).deliveryId} after ${(event as any).attempts} attempts`,
    );
    this.eventEmitter.emit(DELIVERY_EVENTS.NO_DRIVER_FOUND, event);
  }

  // ========================================
  // DRIVER EVENTS
  // ========================================

  emitDriverOnline(event: DriverEvent) {
    this.logger.log(`[DRIVER] Online: ${(event as any).driverId}`);
    this.eventEmitter.emit(DRIVER_EVENTS.ONLINE, event);
  }

  emitDriverOffline(event: DriverEvent) {
    this.logger.log(`[DRIVER] Offline: ${(event as any).driverId}`);
    this.eventEmitter.emit(DRIVER_EVENTS.OFFLINE, event);
  }

  emitDriverLocationUpdated(event: DriverEvent) {
    this.logger.debug(`[DRIVER] Location updated: ${(event as any).driverId}`);
    this.eventEmitter.emit(DRIVER_EVENTS.LOCATION_UPDATED, event);
  }

  emitDriverAvailable(event: DriverEvent) {
    this.logger.log(
      `[DRIVER] Available: ${(event as any).driverId} (${(event as any).reason})`,
    );
    this.eventEmitter.emit(DRIVER_EVENTS.AVAILABLE, event);
  }

  emitDriverPingInactive(event: DriverEvent) {
    this.logger.warn(`[DRIVER] Ping inactive: ${(event as any).driverId}`);
    this.eventEmitter.emit(DRIVER_EVENTS.PING_INACTIVE, event);
  }

  emitDriverMarkedInactive(event: DriverEvent) {
    this.logger.warn(`[DRIVER] Marked inactive: ${(event as any).driverId}`);
    this.eventEmitter.emit(DRIVER_EVENTS.MARKED_INACTIVE, event);
  }

  // ========================================
  // NOTIFICATION EVENTS
  // ========================================

  emitSendPushNotification(event: NotificationEvent) {
    this.logger.debug(`[NOTIFICATION] Push: ${(event as any).title}`);
    this.eventEmitter.emit(NOTIFICATION_EVENTS.SEND_PUSH, event);
  }

  emitSendSMS(event: NotificationEvent) {
    this.logger.debug(`[NOTIFICATION] SMS: ${(event as any).phone}`);
    this.eventEmitter.emit(NOTIFICATION_EVENTS.SEND_SMS, event);
  }

  // ========================================
  // GENERIC EMIT
  // ========================================

  emit(eventName: string, payload: any) {
    this.logger.debug(`[EVENT] ${eventName}`, payload);
    this.eventEmitter.emit(eventName, payload);
  }

  // ========================================
  // EVENT LISTENERS (for testing/debugging)
  // ========================================

  onRideRequested(handler: (event: RideEvent) => void) {
    this.eventEmitter.on(RIDE_EVENTS.REQUESTED, handler);
  }

  onDeliveryRequested(handler: (event: DeliveryEvent) => void) {
    this.eventEmitter.on(DELIVERY_EVENTS.REQUESTED, handler);
  }

  onDriverLocationUpdated(handler: (event: DriverEvent) => void) {
    this.eventEmitter.on(DRIVER_EVENTS.LOCATION_UPDATED, handler);
  }
}
