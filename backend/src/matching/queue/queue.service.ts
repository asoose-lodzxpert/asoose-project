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

    @InjectQueue(QUEUE_NAMES.RIDER_INACTIVITY)
    private readonly riderInactivityQueue: Queue,

    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,

    @InjectQueue(QUEUE_NAMES.ASSIGNMENT_TIMEOUT)
    private readonly assignmentTimeoutQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.setupRecurringJobs();
    this.logger.log('✅ Queue service initialized');
  }

  // ========================================
  // RIDE MATCHING QUEUE
  // ========================================

  async enqueueRideMatching(data: MatchRideJobData) {
    const job = await this.rideMatchingQueue.add(JOB_TYPES.MATCH_RIDE, data, {
      ...QUEUE_OPTIONS.rideMatching,
      jobId: `ride-${data.job.id}-attempt-${data.attempt}`,
      priority: this.calculatePriority(data.attempt),
    });

    this.logger.log(
      `Enqueued ride matching: ${data.job.id} (attempt ${data.attempt})`,
    );
    return job;
  }

  // ========================================
  // DELIVERY MATCHING QUEUE
  // ========================================

  async enqueueDeliveryMatching(data: MatchDeliveryJobData) {
    const job = await this.deliveryMatchingQueue.add(
      JOB_TYPES.MATCH_DELIVERY,
      data,
      {
        ...QUEUE_OPTIONS.deliveryMatching,
        jobId: `delivery-${data.job.id}-attempt-${data.attempt}`,
        priority: this.calculatePriority(data.attempt),
      },
    );

    this.logger.log(
      `Enqueued delivery matching: ${data.job.id} (attempt ${data.attempt})`,
    );
    return job;
  }

  // ========================================
  // NOTIFICATION QUEUE
  // ========================================

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
        jobId: `timeout-${data.job.jobType}-${data.job.id}-${data.job.id}`,
      },
    );

    this.logger.debug(
      `Scheduled timeout for ${data.job.jobType} ${data.job.id} in ${delayMs}ms`,
    );
    return job;
  }

  async cancelAssignmentTimeout(jobType: 'ride' | 'delivery', jobId: string) {
    const jobKey = `timeout-${jobType}-${jobId}-${jobId}`;
    const job = await this.assignmentTimeoutQueue.getJob(jobKey);

    if (job) {
      await job.remove();
      this.logger.debug(`Cancelled timeout for ${jobType} ${jobId}`);
      return true;
    }

    return false;
  }

  // ========================================
  // RECURRING JOBS
  // ========================================

  private async setupRecurringJobs() {
    await this.driverInactivityQueue.add(
      JOB_TYPES.CHECK_INACTIVITY,
      { scheduledAt: Date.now() } as CheckInactivityJobData,
      {
        ...QUEUE_OPTIONS.inactivityCheck,
        repeat: { pattern: REPEAT_SCHEDULES.INACTIVITY_CHECK.pattern },
        jobId: REPEAT_SCHEDULES.INACTIVITY_CHECK.jobId,
      },
    );

    await this.riderInactivityQueue.add(
      JOB_TYPES.CHECK_INACTIVITY,
      { scheduledAt: Date.now() } as CheckInactivityJobData,
      {
        ...QUEUE_OPTIONS.inactivityCheck,
        repeat: { pattern: REPEAT_SCHEDULES.RIDER_INACTIVITY_CHECK.pattern },
        jobId: REPEAT_SCHEDULES.RIDER_INACTIVITY_CHECK.jobId,
      },
    );

    this.logger.log('✅ Recurring jobs configured');
  }

  // ========================================
  // QUEUE MANAGEMENT
  // ========================================

  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);

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

  async getAllQueueStats() {
    return Promise.all([
      this.getQueueStats(QUEUE_NAMES.RIDE_MATCHING),
      this.getQueueStats(QUEUE_NAMES.DELIVERY_MATCHING),
      this.getQueueStats(QUEUE_NAMES.DRIVER_INACTIVITY),
      this.getQueueStats(QUEUE_NAMES.NOTIFICATION),
      this.getQueueStats(QUEUE_NAMES.ASSIGNMENT_TIMEOUT),
    ]);
  }

  async pauseQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.warn(`⏸️ Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: string) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`▶️ Queue resumed: ${queueName}`);
  }

  async cleanQueue(queueName: string, grace: number = 24 * 3600 * 1000) {
    const queue = this.getQueue(queueName);

    const [completedCleaned, failedCleaned] = await Promise.all([
      queue.clean(grace, 1000, 'completed'),
      queue.clean(grace * 7, 1000, 'failed'),
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
      case QUEUE_NAMES.RIDER_INACTIVITY:
        return this.riderInactivityQueue;
      case QUEUE_NAMES.NOTIFICATION:
        return this.notificationQueue;
      case QUEUE_NAMES.ASSIGNMENT_TIMEOUT:
        return this.assignmentTimeoutQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  private calculatePriority(attempt: number): number {
    return Math.max(1, 10 - attempt); // higher priority for retries
  }
  async enqueueOrderNotification(data: {
    orderId: string;
    userId: string;
    type: string;
  }) {
    const job = await this.notificationQueue.add(
      'order.notifications', // Job Name
      data,
      QUEUE_OPTIONS.notification,
    );

    this.logger.debug(`Enqueued order notification: ${data.orderId}`);
    return job;
  }
  async enqueueOrderNotificationBulk(
    jobs: Array<{
      name: string;
      data: { orderId: string; userId: string; type: string };
    }>,
  ) {
    const jobOpts = QUEUE_OPTIONS.notification;

    // Map to BullMQ bulk format
    const bulkJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: jobOpts,
    }));

    const result = await this.notificationQueue.addBulk(bulkJobs);
    this.logger.debug(`Enqueued ${result.length} bulk order notifications`);
    return result;
  }
}
