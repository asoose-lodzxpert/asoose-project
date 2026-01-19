import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_NAMES,
  JOB_TYPES,
  QUEUE_OPTIONS,
  REPEAT_SCHEDULES,
  MatchRideJobData,
  MatchDeliveryJobData,
  CheckInactivityJobData,
  SendPushNotificationJobData,
  SendSMSJobData,
  HandleAssignmentTimeoutJobData,
} from './queue.constants';

/**
 * Queue Service
 *
 * Manages job enqueuing across all queues in the matching system.
 * Provides type-safe interfaces for adding jobs.
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RIDE_MATCHING)
    private readonly rideMatchingQueue: Queue,

    @InjectQueue(QUEUE_NAMES.DELIVERY_MATCHING)
    private readonly deliveryMatchingQueue: Queue,

    @InjectQueue(QUEUE_NAMES.DRIVER_INACTIVITY)
    private readonly driverInactivityQueue: Queue,

    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,

    @InjectQueue(QUEUE_NAMES.ASSIGNMENT_TIMEOUT)
    private readonly assignmentTimeoutQueue: Queue,
  ) {}

  async onModuleInit() {
    // Setup recurring jobs
    await this.setupRecurringJobs();
    this.logger.log('✅ Queue service initialized');
  }

  // ========================================
  // RIDE MATCHING QUEUE
  // ========================================

  /**
   * Enqueue a ride matching job
   */
  async enqueueRideMatching(data: MatchRideJobData) {
    const job = await this.rideMatchingQueue.add(JOB_TYPES.MATCH_RIDE, data, {
      ...QUEUE_OPTIONS.rideMatching,
      jobId: `ride-${data.rideId}-attempt-${data.attempt}`,
      priority: this.calculatePriority(data.attempt),
    });

    this.logger.log(
      `Enqueued ride matching: ${data.rideId} (attempt ${data.attempt})`,
    );
    return job;
  }

  // ========================================
  // DELIVERY MATCHING QUEUE
  // ========================================

  /**
   * Enqueue a delivery matching job
   */
  async enqueueDeliveryMatching(data: MatchDeliveryJobData) {
    const job = await this.deliveryMatchingQueue.add(
      JOB_TYPES.MATCH_DELIVERY,
      data,
      {
        ...QUEUE_OPTIONS.deliveryMatching,
        jobId: `delivery-${data.deliveryId}-attempt-${data.attempt}`,
        priority: this.calculatePriority(data.attempt),
      },
    );

    this.logger.log(
      `Enqueued delivery matching: ${data.deliveryId} (attempt ${data.attempt})`,
    );
    return job;
  }

  // ========================================
  // NOTIFICATION QUEUE
  // ========================================

  /**
   * Enqueue push notification
   */
  async enqueuePushNotification(data: SendPushNotificationJobData) {
    const job = await this.notificationQueue.add(
      JOB_TYPES.SEND_PUSH_NOTIFICATION,
      data,
      {
        ...QUEUE_OPTIONS.notification,
        priority: data.priority === 'high' ? 1 : 5,
      },
    );

    this.logger.debug(`Enqueued push notification: ${data.title}`);
    return job;
  }

  /**
   * Enqueue SMS notification
   */
  async enqueueSMS(data: SendSMSJobData) {
    const job = await this.notificationQueue.add(
      JOB_TYPES.SEND_SMS,
      data,
      QUEUE_OPTIONS.notification,
    );

    this.logger.debug(`Enqueued SMS: ${data.phone}`);
    return job;
  }

  // ========================================
  // ASSIGNMENT TIMEOUT QUEUE
  // ========================================

  /**
   * Schedule assignment timeout handler (delayed job)
   */
  async scheduleAssignmentTimeout(
    data: HandleAssignmentTimeoutJobData,
    delayMs: number,
  ) {
    const job = await this.assignmentTimeoutQueue.add(
      JOB_TYPES.HANDLE_ASSIGNMENT_TIMEOUT,
      data,
      {
        ...QUEUE_OPTIONS.assignmentTimeout,
        delay: delayMs,
        jobId: `timeout-${data.tripType}-${data.tripId}-${data.driverId}`,
      },
    );

    this.logger.debug(
      `Scheduled timeout for ${data.tripType} ${data.tripId} in ${delayMs}ms`,
    );
    return job;
  }

  /**
   * Cancel scheduled assignment timeout
   */
  async cancelAssignmentTimeout(
    tripType: 'ride' | 'delivery',
    tripId: string,
    driverId: string,
  ) {
    const jobId = `timeout-${tripType}-${tripId}-${driverId}`;
    const job = await this.assignmentTimeoutQueue.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.debug(`Cancelled timeout for ${tripType} ${tripId}`);
      return true;
    }

    return false;
  }

  // ========================================
  // RECURRING JOBS
  // ========================================

  private async setupRecurringJobs() {
    // Setup inactivity check recurring job
    await this.driverInactivityQueue.add(
      JOB_TYPES.CHECK_INACTIVITY,
      { scheduledAt: Date.now() } as CheckInactivityJobData,
      {
        ...QUEUE_OPTIONS.inactivityCheck,
        repeat: {
          pattern: REPEAT_SCHEDULES.INACTIVITY_CHECK.pattern,
        },
        jobId: REPEAT_SCHEDULES.INACTIVITY_CHECK.jobId,
      },
    );

    this.logger.log('✅ Recurring jobs configured');
  }

  // ========================================
  // QUEUE MANAGEMENT
  // ========================================

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string) {
    let queue: Queue;

    switch (queueName) {
      case QUEUE_NAMES.RIDE_MATCHING:
        queue = this.rideMatchingQueue;
        break;
      case QUEUE_NAMES.DELIVERY_MATCHING:
        queue = this.deliveryMatchingQueue;
        break;
      case QUEUE_NAMES.DRIVER_INACTIVITY:
        queue = this.driverInactivityQueue;
        break;
      case QUEUE_NAMES.NOTIFICATION:
        queue = this.notificationQueue;
        break;
      case QUEUE_NAMES.ASSIGNMENT_TIMEOUT:
        queue = this.assignmentTimeoutQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  /**
   * Get all queues stats
   */
  async getAllQueueStats() {
    const stats = await Promise.all([
      this.getQueueStats(QUEUE_NAMES.RIDE_MATCHING),
      this.getQueueStats(QUEUE_NAMES.DELIVERY_MATCHING),
      this.getQueueStats(QUEUE_NAMES.DRIVER_INACTIVITY),
      this.getQueueStats(QUEUE_NAMES.NOTIFICATION),
      this.getQueueStats(QUEUE_NAMES.ASSIGNMENT_TIMEOUT),
    ]);

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.warn(`⏸️  Queue paused: ${queueName}`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`▶️  Queue resumed: ${queueName}`);
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName: string, grace: number = 24 * 3600 * 1000) {
    const queue = this.getQueue(queueName);

    const [completedCleaned, failedCleaned] = await Promise.all([
      queue.clean(grace, 1000, 'completed'),
      queue.clean(grace * 7, 1000, 'failed'), // Keep failed jobs longer
    ]);

    this.logger.log(
      `🧹 Cleaned queue ${queueName}: ${completedCleaned.length} completed, ${failedCleaned.length} failed`,
    );

    return {
      completedCleaned: completedCleaned.length,
      failedCleaned: failedCleaned.length,
    };
  }

  // ========================================
  // UTILITIES
  // ========================================

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case QUEUE_NAMES.RIDE_MATCHING:
        return this.rideMatchingQueue;
      case QUEUE_NAMES.DELIVERY_MATCHING:
        return this.deliveryMatchingQueue;
      case QUEUE_NAMES.DRIVER_INACTIVITY:
        return this.driverInactivityQueue;
      case QUEUE_NAMES.NOTIFICATION:
        return this.notificationQueue;
      case QUEUE_NAMES.ASSIGNMENT_TIMEOUT:
        return this.assignmentTimeoutQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  private calculatePriority(attempt: number): number {
    // Higher priority for retries
    return Math.max(1, 10 - attempt);
  }
}
