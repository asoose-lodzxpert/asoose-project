/**
 * Event Type Definitions
 *
 * All events in the matching system are strongly typed.
 * Events are emitted by API/workers and consumed by other services.
 */

// ========================================
// RIDE EVENTS
// ========================================

export const RIDE_EVENTS = {
  REQUESTED: 'ride.requested',
  ASSIGNMENT_REQUESTED: 'ride.assignment.requested',
  ASSIGNED: 'ride.assigned',
  ACCEPTED: 'ride.accepted',
  DECLINED: 'ride.declined',
  TIMEOUT: 'ride.timeout',
  STARTED: 'ride.started',
  COMPLETED: 'ride.completed',
  CANCELLED: 'ride.cancelled',
  NO_DRIVER_FOUND: 'ride.no_driver_found',
} as const;

export interface RideRequestedEvent {
  rideId: string;
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
  totalFare: number;
  timestamp: number;
}

export interface RideAssignmentRequestedEvent {
  rideId: string;
  driverId: string;
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  totalFare: number;
  distanceKm: number;
  estimatedDurationMin: number;
  expiresAt: number; // Unix timestamp (90s from now)
  timestamp: number;
}

export interface RideAssignedEvent {
  rideId: string;
  driverId: string;
  customerId: string;
  assignedAt: number;
}

export interface RideAcceptedEvent {
  rideId: string;
  driverId: string;
  customerId: string;
  acceptedAt: number;
}

export interface RideDeclinedEvent {
  rideId: string;
  driverId: string;
  reason?: string;
  declinedAt: number;
}

export interface RideTimeoutEvent {
  rideId: string;
  driverId: string;
  timeoutAt: number;
}

export interface RideStartedEvent {
  rideId: string;
  driverId: string;
  customerId: string;
  startOtp: string;
  startedAt: number;
}

export interface RideCompletedEvent {
  rideId: string;
  driverId: string;
  customerId: string;
  totalFare: number;
  distanceKm: number;
  durationMin: number;
  completedAt: number;
}

export interface RideCancelledEvent {
  rideId: string;
  customerId: string;
  driverId?: string;
  cancelledBy: 'customer' | 'driver' | 'system';
  reason?: string;
  cancelledAt: number;
}

export interface RideNoDriverFoundEvent {
  rideId: string;
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  attempts: number;
  timestamp: number;
}

// ========================================
// DELIVERY EVENTS
// ========================================

export const DELIVERY_EVENTS = {
  REQUESTED: 'delivery.requested',
  ASSIGNMENT_REQUESTED: 'delivery.assignment.requested',
  ASSIGNED: 'delivery.assigned',
  ACCEPTED: 'delivery.accepted',
  DECLINED: 'delivery.declined',
  TIMEOUT: 'delivery.timeout',
  PICKED_UP: 'delivery.picked_up',
  DELIVERED: 'delivery.delivered',
  CANCELLED: 'delivery.cancelled',
  NO_DRIVER_FOUND: 'delivery.no_driver_found',
} as const;

export interface DeliveryRequestedEvent {
  deliveryId: string;
  customerId: string;
  orderId?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
  deliveryFee: number;
  packageDetails?: string;
  recipientName: string;
  recipientPhone: string;
  timestamp: number;
}

export interface DeliveryAssignmentRequestedEvent {
  deliveryId: string;
  driverId: string;
  customerId: string;
  orderId?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  deliveryFee: number;
  distanceKm: number;
  packageDetails?: string;
  recipientName: string;
  recipientPhone: string;
  expiresAt: number;
  timestamp: number;
}

export interface DeliveryAssignedEvent {
  deliveryId: string;
  driverId: string;
  customerId: string;
  assignedAt: number;
}

export interface DeliveryAcceptedEvent {
  deliveryId: string;
  driverId: string;
  customerId: string;
  acceptedAt: number;
}

export interface DeliveryDeclinedEvent {
  deliveryId: string;
  driverId: string;
  reason?: string;
  declinedAt: number;
}

export interface DeliveryTimeoutEvent {
  deliveryId: string;
  driverId: string;
  timeoutAt: number;
}

export interface DeliveryPickedUpEvent {
  deliveryId: string;
  driverId: string;
  pickupOtp: string;
  pickedUpAt: number;
}

export interface DeliveryDeliveredEvent {
  deliveryId: string;
  driverId: string;
  customerId: string;
  deliveryOtp: string;
  deliveryFee: number;
  deliveredAt: number;
}

export interface DeliveryCancelledEvent {
  deliveryId: string;
  customerId: string;
  driverId?: string;
  cancelledBy: 'customer' | 'driver' | 'system';
  reason?: string;
  cancelledAt: number;
}

export interface DeliveryNoDriverFoundEvent {
  deliveryId: string;
  customerId: string;
  orderId?: string;
  pickupLat: number;
  pickupLng: number;
  attempts: number;
  timestamp: number;
}

// ========================================
// DRIVER EVENTS
// ========================================

export const DRIVER_EVENTS = {
  ONLINE: 'driver.online',
  OFFLINE: 'driver.offline',
  LOCATION_UPDATED: 'driver.location.updated',
  AVAILABLE: 'driver.available',
  PING_INACTIVE: 'driver.ping.inactive',
  MARKED_INACTIVE: 'driver.marked.inactive',
} as const;

export interface DriverOnlineEvent {
  driverId: string;
  lat: number;
  lng: number;
  hexId: string;
  timestamp: number;
}

export interface DriverOfflineEvent {
  driverId: string;
  reason?: string;
  timestamp: number;
}

export interface DriverLocationUpdatedEvent {
  driverId: string;
  lat: number;
  lng: number;
  hexId: string;
  oldHexId?: string;
  hexChanged: boolean;
  timestamp: number;
}

export interface DriverAvailableEvent {
  driverId: string;
  hexId: string;
  lat: number;
  lng: number;
  reason: 'trip_completed' | 'trip_cancelled' | 'decline_timeout';
  timestamp: number;
}

export interface DriverPingInactiveEvent {
  driverId: string;
  lastSeen: number;
  timestamp: number;
}

export interface DriverMarkedInactiveEvent {
  driverId: string;
  lastSeen: number;
  markedAt: number;
}

// ========================================
// NOTIFICATION EVENTS
// ========================================

export const NOTIFICATION_EVENTS = {
  SEND_PUSH: 'notification.send.push',
  SEND_SMS: 'notification.send.sms',
} as const;

export interface SendPushNotificationEvent {
  userId?: string;
  driverId?: string;
  expoPushToken?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
  sound?: string;
}

export interface SendSMSNotificationEvent {
  phone: string;
  message: string;
  timestamp: number;
}

// ========================================
// TYPE UNIONS FOR EVENT HANDLERS
// ========================================

export type RideEvent =
  | RideRequestedEvent
  | RideAssignmentRequestedEvent
  | RideAssignedEvent
  | RideAcceptedEvent
  | RideDeclinedEvent
  | RideTimeoutEvent
  | RideStartedEvent
  | RideCompletedEvent
  | RideCancelledEvent
  | RideNoDriverFoundEvent;

export type DeliveryEvent =
  | DeliveryRequestedEvent
  | DeliveryAssignmentRequestedEvent
  | DeliveryAssignedEvent
  | DeliveryAcceptedEvent
  | DeliveryDeclinedEvent
  | DeliveryTimeoutEvent
  | DeliveryPickedUpEvent
  | DeliveryDeliveredEvent
  | DeliveryCancelledEvent
  | DeliveryNoDriverFoundEvent;

export type DriverEvent =
  | DriverOnlineEvent
  | DriverOfflineEvent
  | DriverLocationUpdatedEvent
  | DriverAvailableEvent
  | DriverPingInactiveEvent
  | DriverMarkedInactiveEvent;

export type NotificationEvent =
  | SendPushNotificationEvent
  | SendSMSNotificationEvent;

export type MatchingEvent =
  | RideEvent
  | DeliveryEvent
  | DriverEvent
  | NotificationEvent;
