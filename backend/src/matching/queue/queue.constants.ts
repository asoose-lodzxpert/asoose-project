/**
 * Queue Names and Job Types
 */

export const QUEUE_NAMES = {
  RIDE_MATCHING: 'ride-matching',
  DELIVERY_MATCHING: 'delivery-matching',
  DRIVER_INACTIVITY: 'driver-inactivity',
  NOTIFICATION: 'notification',
  ASSIGNMENT_TIMEOUT: 'assignment-timeout',
} as const;

export const JOB_TYPES = {
  MATCH_RIDE: 'match-ride',
  MATCH_DELIVERY: 'match-delivery',
  CHECK_INACTIVITY: 'check-inactivity',
  SEND_PUSH_NOTIFICATION: 'send-push-notification',
  SEND_SMS: 'send-sms',
  HANDLE_ASSIGNMENT_TIMEOUT: 'handle-assignment-timeout',
} as const;

// ========================================
// JOB DATA INTERFACES
// ========================================

export interface MatchRideJobData {
  rideId: string;
  customerId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceKm: number;
  totalFare: number;
  attempt: number;
  excludeDriverIds?: string[];
}

export interface MatchDeliveryJobData {
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
  attempt: number;
  excludeDriverIds?: string[];
}

export interface CheckInactivityJobData {
  scheduledAt: number;
}

export interface SendPushNotificationJobData {
  userId?: string;
  driverId?: string;
  expoPushToken?: string;
  fcmToken?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: 'default' | 'normal' | 'high';
  sound?: string;
}

export interface SendSMSJobData {
  phone: string;
  message: string;
}

export interface HandleAssignmentTimeoutJobData {
  tripType: 'ride' | 'delivery';
  tripId: string;
  driverId: string;
  scheduledFor: number;
}

// ========================================
// QUEUE OPTIONS
// ========================================

export const QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },

  rideMatching: {
    attempts: 5, // More attempts for critical matching
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    timeout: 30000, // 30 seconds per matching attempt
  },

  deliveryMatching: {
    attempts: 5,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    timeout: 30000,
  },

  inactivityCheck: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 5000,
    },
    timeout: 60000, // 60 seconds for inactivity check
  },

  notification: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 500,
    },
    timeout: 10000, // 10 seconds for notification
  },

  assignmentTimeout: {
    attempts: 1, // Don't retry timeout handling
    timeout: 5000,
  },
} as const;

// ========================================
// CONCURRENCY SETTINGS
// ========================================

export const WORKER_CONCURRENCY = {
  RIDE_MATCHING: 10, // Process up to 10 ride matches concurrently
  DELIVERY_MATCHING: 10,
  DRIVER_INACTIVITY: 1, // Single worker for inactivity check
  NOTIFICATION: 20, // High concurrency for notifications
  ASSIGNMENT_TIMEOUT: 5,
} as const;

// ========================================
// REPEAT SCHEDULES (CRON)
// ========================================

export const REPEAT_SCHEDULES = {
  INACTIVITY_CHECK: {
    pattern: '*/30 * * * * *', // Every 30 seconds
    jobId: 'inactivity-check',
  },
} as const;
