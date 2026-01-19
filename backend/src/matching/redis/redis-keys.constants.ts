/**
 * Redis Key Structures for Real-Time Matching System
 *
 * CRITICAL: Driver state (status, location, active trips) lives ONLY in Redis.
 * Database stores stable business records only.
 */

export const REDIS_KEYS = {
  // ========================================
  // DRIVER STATE (SOURCE OF TRUTH)
  // ========================================

  /** Driver online status: OFFLINE | ONLINE | ACTIVE */
  DRIVER_STATUS: (driverId: string) => `driver:${driverId}:status`,

  /** Current hex ID where driver is located */
  DRIVER_HEX: (driverId: string) => `driver:${driverId}:hex`,

  /** Unix timestamp of last location update */
  DRIVER_LAST_SEEN: (driverId: string) => `driver:${driverId}:lastSeen`,

  /** Current active ride ID (only if status = ACTIVE) */
  DRIVER_CURRENT_RIDE: (driverId: string) => `driver:${driverId}:currentRide`,

  /** Current active delivery ID (only if status = ACTIVE) */
  DRIVER_CURRENT_DELIVERY: (driverId: string) =>
    `driver:${driverId}:currentDelivery`,

  /** Pending ride assignment (TTL 90s) */
  DRIVER_PENDING_RIDE: (driverId: string) => `driver:${driverId}:pendingRide`,

  /** Pending delivery assignment (TTL 90s) */
  DRIVER_PENDING_DELIVERY: (driverId: string) =>
    `driver:${driverId}:pendingDelivery`,

  /** Driver's current location (lat, lng) stored as GeoJSON */
  DRIVER_LOCATION: (driverId: string) => `driver:${driverId}:location`,

  // ========================================
  // HEX GEOSPATIAL INDEX
  // ========================================

  /** Set of available driver IDs in a hex (only ONLINE, not ACTIVE, no pending) */
  HEX_DRIVERS: (hexId: string) => `hex:${hexId}:drivers`,

  /** Geospatial index for all online drivers (for fallback queries) */
  DRIVERS_GEO_INDEX: 'drivers:geo',

  // ========================================
  // ASSIGNMENT LOCKS (PREVENT DOUBLE ASSIGNMENT)
  // ========================================

  /** Lock to prevent race condition during ride assignment (TTL 90s) */
  LOCK_RIDE_DRIVER: (rideId: string, driverId: string) =>
    `lock:ride:${rideId}:driver:${driverId}`,

  /** Lock to prevent race condition during delivery assignment (TTL 90s) */
  LOCK_DELIVERY_DRIVER: (deliveryId: string, driverId: string) =>
    `lock:delivery:${deliveryId}:driver:${driverId}`,

  /** Global lock for a ride to prevent multiple simultaneous matches */
  LOCK_RIDE: (rideId: string) => `lock:ride:${rideId}`,

  /** Global lock for a delivery to prevent multiple simultaneous matches */
  LOCK_DELIVERY: (deliveryId: string) => `lock:delivery:${deliveryId}`,

  // ========================================
  // MATCHING METADATA
  // ========================================

  /** Track matching attempts for a ride/delivery */
  MATCHING_ATTEMPTS: (tripType: 'ride' | 'delivery', tripId: string) =>
    `matching:${tripType}:${tripId}:attempts`,

  /** List of drivers who declined this trip */
  DECLINED_DRIVERS: (tripType: 'ride' | 'delivery', tripId: string) =>
    `matching:${tripType}:${tripId}:declined`,

  /** Current matching state for a trip */
  MATCHING_STATE: (tripType: 'ride' | 'delivery', tripId: string) =>
    `matching:${tripType}:${tripId}:state`,

  // ========================================
  // ANALYTICS & MONITORING
  // ========================================

  /** Real-time count of online drivers per hex */
  HEX_DRIVER_COUNT: (hexId: string) => `hex:${hexId}:count`,

  /** Real-time active trips counter */
  ACTIVE_TRIPS_COUNT: (tripType: 'ride' | 'delivery') =>
    `trips:${tripType}:active`,

  /** Driver performance metrics */
  DRIVER_METRICS: (driverId: string) => `driver:${driverId}:metrics`,
} as const;

export const REDIS_TTL = {
  /** Pending assignment TTL (driver has 90s to respond) */
  PENDING_ASSIGNMENT: 90,

  /** Assignment lock TTL */
  ASSIGNMENT_LOCK: 90,

  /** Driver considered inactive after 2 minutes */
  DRIVER_INACTIVITY: 120,

  /** Matching state cache */
  MATCHING_STATE: 300, // 5 minutes

  /** Declined drivers list expires after 1 hour */
  DECLINED_DRIVERS: 3600,

  /** Matching attempts counter expires after 1 hour */
  MATCHING_ATTEMPTS: 3600,

  /** Metrics cache */
  METRICS: 300,
} as const;

export enum DriverStatus {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  ACTIVE = 'ACTIVE',
}

export enum TripType {
  RIDE = 'ride',
  DELIVERY = 'delivery',
}

export interface DriverState {
  id: string;
  status: DriverStatus;
  hexId: string | null;
  lastSeen: number;
  currentRide: string | null;
  currentDelivery: string | null;
  pendingRide: string | null;
  pendingDelivery: string | null;
  location: {
    lat: number;
    lng: number;
  } | null;
}

export interface MatchingState {
  tripId: string;
  tripType: TripType;
  attempts: number;
  currentRing: number;
  declinedDrivers: string[];
  startedAt: number;
  lastAttemptAt: number;
}
