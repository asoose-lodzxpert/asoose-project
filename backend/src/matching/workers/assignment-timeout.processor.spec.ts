import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AssignmentTimeoutProcessor } from './assignment-timeout.processor';
import { DriverStateService } from '../driver-state/driver-state.service';
import { RiderStateService } from '../rider-state/rider-state.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HandleAssignmentTimeoutJobData } from '../queue/queue.constants';

/**
 * AssignmentTimeoutProcessor Unit Tests
 *
 * Covers 90-second assignment timeout logic for both ride and delivery:
 *  - Driver/rider state cleanup when a party is known
 *  - Re-enqueue matching when the entity is still REQUESTED
 *  - Early-exit when entity is not found or no longer needs a match
 *  - Error isolation (no re-throw from the processor)
 */
describe('AssignmentTimeoutProcessor', () => {
  let processor: AssignmentTimeoutProcessor;
  let driverState: jest.Mocked<DriverStateService>;
  let riderState: jest.Mocked<RiderStateService>;
  let queue: jest.Mocked<QueueService>;
  let prisma: jest.Mocked<PrismaService>;

  // shared fixtures
  const RIDE_ID = 'ride-111';
  const DELIVERY_ID = 'delivery-222';
  const DRIVER_ID = 'driver-aaa';
  const RIDER_ID = 'rider-bbb';

  const PICKUP = { lat: 6.5244, lng: 3.3792 };
  const DROPOFF = { lat: 6.4281, lng: 3.4219 };

  function makeRideJob(
    overrides: Partial<HandleAssignmentTimeoutJobData['job']> = {},
  ): Job<HandleAssignmentTimeoutJobData> {
    return {
      data: {
        job: {
          id: RIDE_ID,
          jobType: 'ride',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
          customerName: 'Test Customer',
          earnings: 2500,
          status: 'incoming-job',
          ...overrides,
        },
      },
    } as Job<HandleAssignmentTimeoutJobData>;
  }

  function makeDeliveryJob(
    overrides: Partial<HandleAssignmentTimeoutJobData['job']> = {},
  ): Job<HandleAssignmentTimeoutJobData> {
    return {
      data: {
        job: {
          id: DELIVERY_ID,
          jobType: 'delivery',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
          customerName: 'Test Recipient',
          earnings: 1500,
          status: 'incoming-job',
          packageDetails: 'Electronics',
          ...overrides,
        },
      },
    } as Job<HandleAssignmentTimeoutJobData>;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentTimeoutProcessor,
        {
          provide: DriverStateService,
          useValue: {
            handleAssignmentTimeout: jest.fn(),
          },
        },
        {
          provide: RiderStateService,
          useValue: {
            declineJob: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            enqueueRideMatching: jest.fn(),
            enqueueDeliveryMatching: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            ride: {
              findUnique: jest.fn(),
            },
            delivery: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    processor = module.get<AssignmentTimeoutProcessor>(
      AssignmentTimeoutProcessor,
    );
    driverState = module.get(
      DriverStateService,
    ) as jest.Mocked<DriverStateService>;
    riderState = module.get(
      RiderStateService,
    ) as jest.Mocked<RiderStateService>;
    queue = module.get(QueueService) as jest.Mocked<QueueService>;
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  RIDE timeouts
  // ═══════════════════════════════════════════════════════════════════
  describe('ride assignment timeout', () => {
    it('calls handleAssignmentTimeout and re-enqueues matching when driver was assigned', async () => {
      // 1st findUnique → get riderId (driver in ride context)
      (prisma.ride.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: DRIVER_ID })
        // 2nd findUnique inside retryRideMatching
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (driverState.handleAssignmentTimeout as jest.Mock).mockResolvedValue(
        undefined,
      );
      (queue.enqueueRideMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeRideJob());

      expect(driverState.handleAssignmentTimeout).toHaveBeenCalledTimes(1);
      expect(driverState.handleAssignmentTimeout).toHaveBeenCalledWith(
        DRIVER_ID,
        { jobId: RIDE_ID, jobType: 'ride' },
      );
      expect(queue.enqueueRideMatching).toHaveBeenCalledTimes(1);
    });

    it('skips handleAssignmentTimeout but still re-enqueues when no driver was assigned', async () => {
      (prisma.ride.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: null }) // no driver
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (queue.enqueueRideMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeRideJob());

      expect(driverState.handleAssignmentTimeout).not.toHaveBeenCalled();
      expect(queue.enqueueRideMatching).toHaveBeenCalledTimes(1);
    });

    it('does NOT re-enqueue when ride is no longer in REQUESTED status', async () => {
      (prisma.ride.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: DRIVER_ID })
        .mockResolvedValueOnce({
          status: 'ACCEPTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (driverState.handleAssignmentTimeout as jest.Mock).mockResolvedValue(
        undefined,
      );

      await processor.process(makeRideJob());

      expect(queue.enqueueRideMatching).not.toHaveBeenCalled();
    });

    it('does NOT re-enqueue when ride entity is not found during retry', async () => {
      (prisma.ride.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: null }) // 1st: no driver
        .mockResolvedValueOnce(null); // 2nd: entity gone

      await processor.process(makeRideJob());

      expect(queue.enqueueRideMatching).not.toHaveBeenCalled();
    });

    it('passes excludeDriverIds so the timed-out driver is skipped on retry', async () => {
      const jobWithDriver = makeRideJob({ id: RIDE_ID } as any);
      // Simulate job summary having a driverId property (set at match time)
      (jobWithDriver.data.job as any).driverId = DRIVER_ID;

      (prisma.ride.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: DRIVER_ID })
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (driverState.handleAssignmentTimeout as jest.Mock).mockResolvedValue(
        undefined,
      );
      (queue.enqueueRideMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(jobWithDriver);

      expect(queue.enqueueRideMatching).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeDriverIds: expect.arrayContaining([DRIVER_ID]),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  DELIVERY timeouts
  // ═══════════════════════════════════════════════════════════════════
  describe('delivery assignment timeout', () => {
    it('calls riderState.declineJob and re-enqueues matching when rider was assigned', async () => {
      (prisma.delivery.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: RIDER_ID })
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (riderState.declineJob as jest.Mock).mockResolvedValue(undefined);
      (queue.enqueueDeliveryMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeDeliveryJob());

      expect(riderState.declineJob).toHaveBeenCalledTimes(1);
      expect(riderState.declineJob).toHaveBeenCalledWith(
        RIDER_ID,
        { jobId: DELIVERY_ID, jobType: 'delivery' },
        'timeout',
      );
      expect(queue.enqueueDeliveryMatching).toHaveBeenCalledTimes(1);
    });

    it('skips declineJob but still re-enqueues when no rider was assigned', async () => {
      (prisma.delivery.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: null })
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (queue.enqueueDeliveryMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeDeliveryJob());

      expect(riderState.declineJob).not.toHaveBeenCalled();
      expect(queue.enqueueDeliveryMatching).toHaveBeenCalledTimes(1);
    });

    it('does NOT re-enqueue when delivery is no longer REQUESTED', async () => {
      (prisma.delivery.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: RIDER_ID })
        .mockResolvedValueOnce({
          status: 'ASSIGNED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (riderState.declineJob as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeDeliveryJob());

      expect(queue.enqueueDeliveryMatching).not.toHaveBeenCalled();
    });

    it('does NOT re-enqueue when delivery entity is not found during retry', async () => {
      (prisma.delivery.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: null })
        .mockResolvedValueOnce(null); // entity gone

      await processor.process(makeDeliveryJob());

      expect(queue.enqueueDeliveryMatching).not.toHaveBeenCalled();
    });

    it('continues to re-enqueue even when riderState.declineJob throws (non-fatal)', async () => {
      (prisma.delivery.findUnique as jest.Mock)
        .mockResolvedValueOnce({ riderId: RIDER_ID })
        .mockResolvedValueOnce({
          status: 'REQUESTED',
          pickupAddress: PICKUP,
          dropoffAddress: DROPOFF,
        });

      (riderState.declineJob as jest.Mock).mockRejectedValue(
        new Error('Redis unavailable'),
      );
      (queue.enqueueDeliveryMatching as jest.Mock).mockResolvedValue(undefined);

      await processor.process(makeDeliveryJob());

      // Re-enqueue should still happen despite declineJob failure
      expect(queue.enqueueDeliveryMatching).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Error isolation
  // ═══════════════════════════════════════════════════════════════════
  describe('error handling', () => {
    it('does not throw when an unexpected error occurs inside process()', async () => {
      (prisma.ride.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB is down'),
      );

      await expect(processor.process(makeRideJob())).resolves.toBeUndefined();
    });

    it('does not re-throw delivery processing errors', async () => {
      (prisma.delivery.findUnique as jest.Mock).mockRejectedValue(
        new Error('Unexpected failure'),
      );

      await expect(
        processor.process(makeDeliveryJob()),
      ).resolves.toBeUndefined();
    });

    it('calls neither ride nor delivery path for an unknown jobType', async () => {
      const unknownJob = {
        data: {
          job: {
            id: 'x',
            jobType: 'unknown' as any,
            pickupAddress: PICKUP,
            dropoffAddress: DROPOFF,
            customerName: 'X',
            earnings: 0,
            status: 'incoming-job',
          },
        },
      } as Job<HandleAssignmentTimeoutJobData>;

      // Should not throw, and no state/queue calls should be made
      await expect(processor.process(unknownJob)).resolves.toBeUndefined();
      expect(driverState.handleAssignmentTimeout).not.toHaveBeenCalled();
      expect(riderState.declineJob).not.toHaveBeenCalled();
      expect(queue.enqueueRideMatching).not.toHaveBeenCalled();
      expect(queue.enqueueDeliveryMatching).not.toHaveBeenCalled();
    });
  });
});
