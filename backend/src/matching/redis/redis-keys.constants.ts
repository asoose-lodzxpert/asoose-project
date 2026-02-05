/**
 * Redis Key Structures for Real-Time Matching System
 *
 * CRITICAL:
 * - Live state (availability, location, assignments) lives ONLY in Redis
 * - Database stores stable business records only
 * - Redis keys are job-centric to avoid duplication and race conditions
 */

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const REDIS_KEYS = {
  /** Customer ID for a given ride/job */
  RIDE_CUSTOMER: (rideId: string) => `ride:${rideId}:customer`,
  // ========================================
  // DRIVER STATE (SOURCE OF TRUTH)
  // ========================================

  /** Driver online status: OFFLINE | ONLINE | ACTIVE */
  DRIVER_STATUS: (driverId: string) => `driver:${driverId}:status`,

  /** Driver role: DRIVER | RIDER */
  DRIVER_ROLE: (driverId: string) => `driver:${driverId}:role`,

  /** Current hex ID where driver is located */
  DRIVER_HEX: (driverId: string) => `driver:${driverId}:hex`,

  /** Unix timestamp of last heartbeat / location update */
  DRIVER_LAST_SEEN: (driverId: string) => `driver:${driverId}:lastSeen`,

  /** Current active job ID (only if status = ACTIVE) */
  DRIVER_CURRENT_JOB: (driverId: string) => `driver:${driverId}:currentJob`,

  /** Current active job type (ride | delivery) */
  DRIVER_CURRENT_JOB_TYPE: (driverId: string) =>
    `driver:${driverId}:currentJobType`,

  /** Pending job assignment (TTL enforced) */
  DRIVER_PENDING_JOB: (driverId: string) => `driver:${driverId}:pendingJob`,

  /** Pending job type (ride | delivery) */
  DRIVER_PENDING_JOB_TYPE: (driverId: string) =>
    `driver:${driverId}:pendingJobType`,

  /** Driver's last known location (GeoJSON) */
  DRIVER_LOCATION: (driverId: string) => `driver:${driverId}:location`,

  // ========================================
  // RIDER STATE (DELIVERY ONLY)
  // ========================================

  /** Rider online status: OFFLINE | ONLINE | ACTIVE */
  RIDER_STATUS: (riderId: string) => `rider:${riderId}:status`,

  /** Current hex ID where rider is located */
  RIDER_HEX: (riderId: string) => `rider:${riderId}:hex`,

  /** Unix timestamp of last heartbeat / location update */
  RIDER_LAST_SEEN: (riderId: string) => `rider:${riderId}:lastSeen`,

  /** Current active delivery ID */
  RIDER_CURRENT_DELIVERY: (riderId: string) =>
    `rider:${riderId}:currentDelivery`,

  /** Pending delivery assignment (TTL enforced) */
  RIDER_PENDING_DELIVERY: (riderId: string) =>
    `rider:${riderId}:pendingDelivery`,

  /** Rider's last known location (GeoJSON) */
  RIDER_LOCATION: (riderId: string) => `rider:${riderId}:location`,

  /** Global geospatial index for fallback queries for riders */
  RIDERS_GEO_INDEX: 'riders:geo',

  // ========================================
  // HEX GEOSPATIAL INDEX
  // ========================================

  /**
   * Available drivers in a hex
   * - status = ONLINE
   * - no active job
   * - no pending job
   * - role-compatible with job
   */
  HEX_AVAILABLE_DRIVERS: (hexId: string) => `hex:${hexId}:drivers`,

  /** Global geospatial index for fallback queries */
  DRIVERS_GEO_INDEX: 'drivers:geo',

  // ========================================
  // ASSIGNMENT LOCKS (ATOMICITY GUARANTEES)
  // ========================================

  /** Lock a driver for a specific job (TTL enforced) */
  LOCK_JOB_DRIVER: (jobId: string, driverId: string) =>
    `lock:job:${jobId}:driver:${driverId}`,

  /** Global job lock to prevent concurrent matching */
  LOCK_JOB: (jobId: string) => `lock:job:${jobId}`,

  // ========================================
  // MATCHING METADATA
  // ========================================

  /** Track matching attempts per job */
  MATCHING_ATTEMPTS: (jobId: string) => `matching:${jobId}:attempts`,

  /** Drivers who declined this job */
  DECLINED_DRIVERS: (jobId: string) => `matching:${jobId}:declined`,

  /** Matching state snapshot */
  MATCHING_STATE: (jobId: string) => `matching:${jobId}:state`,

  // ========================================
  // ANALYTICS & MONITORING
  // ========================================

  /** Real-time count of available drivers per hex */
  HEX_DRIVER_COUNT: (hexId: string) => `hex:${hexId}:count`,

  /** Active jobs counter by type */
  ACTIVE_JOBS_COUNT: (jobType: 'ride' | 'delivery') => `jobs:${jobType}:active`,

  /** Driver performance & quality metrics */
  DRIVER_METRICS: (driverId: string) => `driver:${driverId}:metrics`,
} as const;

export const REDIS_TTL = {
  /** Pending assignment TTL (driver response window) */
  PENDING_ASSIGNMENT: 90,

  /** Assignment lock TTL */
  ASSIGNMENT_LOCK: 90,

  /** Driver inactivity threshold */
  DRIVER_INACTIVITY: 120,

  /** Matching state cache */
  MATCHING_STATE: 300,

  /** Declined drivers list */
  DECLINED_DRIVERS: 3600,

  /** Matching attempts counter */
  MATCHING_ATTEMPTS: 3600,

  /** Metrics cache */
  METRICS: 300,
} as const;

// ========================================
// ENUMS & STATE SHAPES
// ========================================

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ACTIVE = 'ACTIVE',
}

export enum RiderStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ACTIVE = 'ACTIVE',
}

export enum JobType {
  RIDE = 'ride',
  DELIVERY = 'delivery',
}

export enum DriverRole {
  DRIVER = 'DRIVER', // accepts ride jobs
  RIDER = 'RIDER', // accepts delivery jobs
}

export interface DriverState {
  id: string;
  role: DriverRole;
  status: DriverStatus;
  hexId: string | null;
  lastSeen: number;

  currentJobId: string | null;
  currentJobType: JobType | null;

  pendingJobId: string | null;
  pendingJobType: JobType | null;

  location: {
    lat: number;
    lng: number;
  } | null;
}

export interface RiderState {
  id: string;
  role: DriverRole; // always RIDER
  status: RiderStatus;
  hexId: string | null;
  lastSeen: number;

  currentJobId: string | null;
  currentJobType: JobType | null;

  pendingJobId: string | null;
  pendingJobType: JobType | null;

  location: {
    lat: number;
    lng: number;
  } | null;
}

export interface MatchingState {
  jobId: string;
  jobType: JobType;
  attempts: number;
  currentRing: number;
  declinedDrivers: string[];
  startedAt: number;
  lastAttemptAt: number;
}
