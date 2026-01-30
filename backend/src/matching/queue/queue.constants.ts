/**
 * Queue Names and Job Types (Job-Based Standardized)
 */

import { JobSummaryDto } from 'src/jobs/job.dto';

/* ========================================
   QUEUE NAMES
   ======================================== */
export const QUEUE_NAMES = {
  RIDE_MATCHING: 'ride-matching',
  DELIVERY_MATCHING: 'delivery-matching',
  DRIVER_INACTIVITY: 'driver-inactivity',
  NOTIFICATION: 'notification',
  ASSIGNMENT_TIMEOUT: 'assignment-timeout',
} as const;

/* ========================================
   JOB TYPES
   ======================================== */
export const JOB_TYPES = {
  MATCH_RIDE: 'match-ride',
  MATCH_DELIVERY: 'match-delivery',
  CHECK_INACTIVITY: 'check-inactivity',
  SEND_PUSH_NOTIFICATION: 'send-push-notification',
  SEND_SMS: 'send-sms',
  HANDLE_ASSIGNMENT_TIMEOUT: 'handle-assignment-timeout',
} as const;

/* ========================================
   JOB DATA INTERFACES
   ======================================== */

/**
 * Matching jobs now use the full JobSummaryDto payload
 * with additional metadata for attempts and driver exclusions
 */
export interface MatchRideJobData {
  job: JobSummaryDto; // jobType must be 'ride'
  attempt: number;
  excludeDriverIds?: string[];
}

export interface MatchDeliveryJobData {
  job: JobSummaryDto; // jobType must be 'delivery'
  attempt: number;
  excludeDriverIds?: string[];
}

/**
 * Driver inactivity checks
 */
export interface CheckInactivityJobData {
  scheduledAt: number;
}

/**
 * Notifications
 */
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

/**
 * Assignment timeout handling for both ride & delivery
 */
export interface HandleAssignmentTimeoutJobData {
  job: JobSummaryDto; // ride or delivery
  scheduledFor: number;
}

/* ========================================
   QUEUE OPTIONS
   ======================================== */
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
    timeout: 60000,
  },

  notification: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 500,
    },
    timeout: 10000,
  },

  assignmentTimeout: {
    attempts: 1, // Don't retry timeout handling
    timeout: 5000,
  },
} as const;

/* ========================================
   WORKER CONCURRENCY
   ======================================== */
export const WORKER_CONCURRENCY = {
  RIDE_MATCHING: 10, // Handle up to 10 ride match jobs concurrently
  DELIVERY_MATCHING: 10,
  DRIVER_INACTIVITY: 1, // Single worker for inactivity check
  NOTIFICATION: 20, // High concurrency for notifications
  ASSIGNMENT_TIMEOUT: 5,
} as const;

/* ========================================
   REPEAT SCHEDULES (CRON)
   ======================================== */
export const REPEAT_SCHEDULES = {
  INACTIVITY_CHECK: {
    pattern: '*/30 * * * * *', // Every 30 seconds
    jobId: 'inactivity-check',
  },
} as const;
