import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  JOB_EVENTS,
  DRIVER_EVENTS,
  NOTIFICATION_EVENTS,
  JobEvent,
  JobAssignedEvent,
  JobUpdatedEvent,
  JobCancelledEvent,
  DriverEvent,
  NotificationEvent,
} from './event-types';

/**
 * Event Bus Service
 *
 * Central event emitter for the matching system.
 * Works for all job types, driver-only emits ride jobs.
 */
@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ========================================
  // JOB EVENTS
  // ========================================

  emitJobAssigned(event: JobAssignedEvent) {
    this.logger.log(
      `[JOB] Assigned: ${event.jobId} -> Driver ${event.driverId}`,
    );
    this.eventEmitter.emit(JOB_EVENTS.ASSIGNED, event);
  }

  emitJobUpdated(event: JobUpdatedEvent) {
    this.logger.log(`[JOB] Updated: ${event.jobId} -> status ${event.status}`);
    this.eventEmitter.emit(JOB_EVENTS.UPDATED, event);
  }

  emitJobCancelled(event: JobCancelledEvent) {
    this.logger.log(
      `[JOB] Cancelled: ${event.jobId} -> Driver ${event.driverId}`,
    );
    this.eventEmitter.emit(JOB_EVENTS.CANCELLED, event);
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

  onJobAssigned(handler: (event: JobAssignedEvent) => void) {
    this.eventEmitter.on(JOB_EVENTS.ASSIGNED, handler);
  }

  onJobUpdated(handler: (event: JobUpdatedEvent) => void) {
    this.eventEmitter.on(JOB_EVENTS.UPDATED, handler);
  }

  onJobCancelled(handler: (event: JobCancelledEvent) => void) {
    this.eventEmitter.on(JOB_EVENTS.CANCELLED, handler);
  }

  onDriverLocationUpdated(handler: (event: DriverEvent) => void) {
    this.eventEmitter.on(DRIVER_EVENTS.LOCATION_UPDATED, handler);
  }
}
