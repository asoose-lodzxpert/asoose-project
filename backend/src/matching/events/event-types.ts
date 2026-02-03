/**
 * Event Type Definitions
 *
 * All matching-related events are job-based.
 * Drivers only participate in jobType: 'ride'.
 * Delivery jobs exist but never enter driver state transitions.
 */

// ========================================
// JOB EVENTS (CORE MATCHING CONTRACT)
// ========================================

export const JOB_EVENTS = {
  ASSIGNED: 'job.assigned',
  UPDATED: 'job.updated',
  CANCELLED: 'job.cancelled',
} as const;

export type JobType = 'ride' | 'delivery';

export type JobStatus =
  | 'requested'
  | 'assignment_requested'
  | 'assigned'
  | 'accepted'
  | 'declined'
  | 'timeout'
  | 'started'
  | 'completed'
  | 'no_driver_found';

/**
 * Base job event shared by all job messages
 */
export interface BaseJobEvent {
  jobId: string;
  jobType: JobType;
  timestamp: number;
}

/**
 * Emitted exactly once when a job is assigned to a driver
 */
export interface JobAssignedEvent extends BaseJobEvent {
  jobType: 'ride'; // enforced at compile-time for drivers
  driverId: string;
  customerId: string;
  expiresAt?: number; // assignment TTL
}

/**
 * Emitted for ALL job state transitions except assignment & cancellation
 */
export interface JobUpdatedEvent extends BaseJobEvent {
  status: JobStatus;
  driverId?: string;
  customerId?: string;

  /**
   * Optional state-specific payload
   * (OTP, metrics, decline reason, etc.)
   */
  metadata?: {
    reason?: string;
    otp?: string;
    distanceKm?: number;
    durationMin?: number;
    earnings?: number;
    attempts?: number;
  };
}

/**
 * Terminal event — job will never transition again
 */
export interface JobCancelledEvent extends BaseJobEvent {
  cancelledBy: 'customer' | 'driver' | 'system';
  driverId?: string;
  reason?: string;
}

// ========================================
// DRIVER EVENTS (UNCHANGED, JOB-AWARE)
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
  reason: 'job_completed' | 'job_cancelled' | 'decline_timeout';
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
// NOTIFICATION EVENTS (UNCHANGED)
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

export type JobEvent = JobAssignedEvent | JobUpdatedEvent | JobCancelledEvent;

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

export type MatchingEvent = JobEvent | DriverEvent | NotificationEvent;
