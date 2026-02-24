import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { DeliveryMatchingProcessor } from './delivery-matching.processor';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchDeliveryJobData } from '../queue/queue.constants';
import {
  DriverStatus,
  DriverRole,
  DriverState,
} from '../redis/redis-keys.constants';

// Helper to create mock driver state
const createMockDriverState = (
  id: string,
  lat: number,
  lng: number,
  hexId: string = '88283082fffffff',
): DriverState => ({
  id,
  role: DriverRole.RIDER,
  status: DriverStatus.ONLINE,
  hexId,
  lastSeen: Date.now(),
  currentJobId: null,
  currentJobType: null,
  pendingJobId: null,
  pendingJobType: null,
  location: { lat, lng },
});

describe('DeliveryMatchingProcessor', () => {
  let processor: DeliveryMatchingProcessor;
  let redisService: jest.Mocked<RedisService>;
  let geoService: jest.Mocked<GeoService>;
  let eventBusService: jest.Mocked<EventBusService>;
  let queueService: jest.Mocked<QueueService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDeliveryId = 'delivery-123';
  const mockRiderId = 'rider-456';
  const mockOrderId = 'order-789';
  const mockHexId = '88283082fffffff';
  const mockPickupLat = 6.5244;
  const mockPickupLng = 3.3792;
  const mockDropoffLat = 6.4281;
  const mockDropoffLng = 3.4219;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryMatchingProcessor,
        {
          provide: RedisService,
          useValue: {
            getDeclinedDrivers: jest.fn(),
            getRidersInHex: jest.fn(),
            getRiderState: jest.fn(),
            incrementMatchingAttempts: jest.fn(),
            getClient: jest.fn(() => ({
              eval: jest.fn(),
            })),
          },
        },
        {
          provide: GeoService,
          useValue: {
            latLngToHex: jest.fn(),
            getHexRings: jest.fn(),
            sortByDistance: jest.fn(),
            calculateDistance: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: {
            emitJobCancelled: jest.fn(),
            emitJobAssigned: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            scheduleAssignmentTimeout: jest.fn(),
            enqueueDeliveryMatching: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            delivery: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            order: {
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<DeliveryMatchingProcessor>(
      DeliveryMatchingProcessor,
    );
    redisService = module.get(RedisService);
    geoService = module.get(GeoService);
    eventBusService = module.get(EventBusService);
    queueService = module.get(QueueService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should skip processing if delivery is not found', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Electronics - Handle with care',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue(null);

      await processor.process(job);

      expect(prismaService.delivery.findUnique).toHaveBeenCalledWith({
        where: { id: mockDeliveryId },
        select: {
          status: true,
          riderId: true,
          customerId: true,
          orderId: true,
        },
      });
      expect(geoService.latLngToHex).not.toHaveBeenCalled();
    });

    it('should skip processing if delivery is not in REQUESTED status', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Food delivery',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'ASSIGNED',
        riderId: mockRiderId,
      });

      await processor.process(job);

      expect(geoService.latLngToHex).not.toHaveBeenCalled();
    });

    it('should successfully match a delivery to a rider', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Groceries',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      // Mock delivery in REQUESTED status
      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      // Mock no declined drivers
      redisService.getDeclinedDrivers.mockResolvedValue([]);

      // Mock hex conversion
      geoService.latLngToHex.mockReturnValue(mockHexId);

      // Mock hex rings (only ring 0 with center hex)
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Mock riders in hex
      redisService.getRidersInHex.mockResolvedValue([mockRiderId]);

      // Mock rider location
      redisService.getRiderState.mockResolvedValue(
        createMockDriverState(mockRiderId, 6.5245, 3.3793, mockHexId),
      );

      // Mock distance sorting
      geoService.sortByDistance.mockReturnValue([
        { id: mockRiderId, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
      ]);

      // Mock successful atomic lock (result = 1)
      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({
        eval: mockEval,
      } as any);

      await processor.process(job);

      // Verify hex conversion was called
      expect(geoService.latLngToHex).toHaveBeenCalledWith(
        mockPickupLat,
        mockPickupLng,
      );

      // Verify rider was locked
      expect(mockEval).toHaveBeenCalled();

      // Verify assignment timeout was scheduled with delivery-specific data
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({
            id: mockDeliveryId,
            jobType: 'delivery',
            packageDetails: 'Groceries',
          }),
        }),
        90000, // TIMEOUT_MS
      );
    });

    it('should exclude declined riders from matching', async () => {
      const declinedRiderId = 'rider-declined';
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Documents',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      // Mock declined riders list
      redisService.getDeclinedDrivers.mockResolvedValue([declinedRiderId]);

      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Mock riders in hex including declined one
      redisService.getRidersInHex.mockResolvedValue([
        declinedRiderId,
        mockRiderId,
      ]);

      // Mock rider locations
      redisService.getRiderState
        .mockResolvedValueOnce(
          createMockDriverState(declinedRiderId, 6.5246, 3.3794, mockHexId),
        )
        .mockResolvedValueOnce(
          createMockDriverState(mockRiderId, 6.5245, 3.3793, mockHexId),
        );

      // Only non-declined rider should be in sorted list
      geoService.sortByDistance.mockReturnValue([
        { id: mockRiderId, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
      ]);

      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify declined riders were retrieved
      expect(redisService.getDeclinedDrivers).toHaveBeenCalledWith(
        mockDeliveryId,
      );
    });

    it('should try next rider if first rider is not available', async () => {
      const rider1 = 'rider-1';
      const rider2 = 'rider-2';

      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Pharmacy items',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);
      redisService.getRidersInHex.mockResolvedValue([rider1, rider2]);

      // Mock both riders online
      redisService.getRiderState
        .mockResolvedValueOnce(
          createMockDriverState(rider1, 6.5245, 3.3793, mockHexId),
        )
        .mockResolvedValueOnce(
          createMockDriverState(rider2, 6.5247, 3.3795, mockHexId),
        );

      geoService.sortByDistance.mockReturnValue([
        { id: rider1, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
        { id: rider2, lat: 6.5247, lng: 3.3795, distanceKm: 0.3 },
      ]);

      // First rider fails (0 = not available), second succeeds
      const mockEval = jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify eval was called twice
      expect(mockEval).toHaveBeenCalledTimes(2);

      // Verify timeout was scheduled for rider2
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalledTimes(1);
    });

    it('should handle no rider found scenario and cancel delivery', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Books',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);

      // Mock all rings with no riders
      geoService.getHexRings.mockReturnValue([
        [mockHexId],
        ['hex-ring1-1', 'hex-ring1-2'],
        ['hex-ring2-1', 'hex-ring2-2'],
      ]);

      redisService.getRidersInHex.mockResolvedValue([]);
      // Return MAX_MATCHING_RETRIES (5) so the cancel branch is taken instead of re-queuing
      redisService.incrementMatchingAttempts.mockResolvedValue(5);

      (prismaService.delivery.update as jest.Mock).mockResolvedValue({} as any);

      await processor.process(job);

      // Verify delivery was cancelled
      expect(prismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: mockDeliveryId },
        data: { status: 'CANCELLED' },
      });
    });

    it('should handle package details correctly in assignment', async () => {
      const packageDetails = 'Fragile - Glass items, handle with extreme care';
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);
      redisService.getRidersInHex.mockResolvedValue([mockRiderId]);

      redisService.getRiderState.mockResolvedValue(
        createMockDriverState(mockRiderId, 6.5245, 3.3793, mockHexId),
      );

      geoService.sortByDistance.mockReturnValue([
        { id: mockRiderId, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
      ]);

      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify timeout was scheduled with correct package details
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({
            packageDetails,
          }),
        }),
        90000,
      );
    });

    it('should expand search through multiple hex rings', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Clothing',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);

      // Mock 3 rings
      const ring0 = [mockHexId];
      const ring1 = ['hex-1-1', 'hex-1-2', 'hex-1-3'];
      const ring2 = ['hex-2-1', 'hex-2-2'];

      geoService.getHexRings.mockReturnValue([ring0, ring1, ring2]);

      // No riders in ring 0 and ring 1, rider found in ring 2
      redisService.getRidersInHex
        .mockResolvedValueOnce([]) // ring 0
        .mockResolvedValueOnce([]) // ring 1, hex 1
        .mockResolvedValueOnce([]) // ring 1, hex 2
        .mockResolvedValueOnce([]) // ring 1, hex 3
        .mockResolvedValueOnce([mockRiderId]); // ring 2, hex 1

      redisService.getRiderState.mockResolvedValue(
        createMockDriverState(mockRiderId, 6.525, 3.38, 'hex-2-1'),
      );

      geoService.sortByDistance.mockReturnValue([
        { id: mockRiderId, lat: 6.525, lng: 3.38, distanceKm: 0.5 },
      ]);

      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify getRidersInHex was called for multiple hexes
      expect(redisService.getRidersInHex).toHaveBeenCalledTimes(5);

      // Verify assignment was successful
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalled();
    });

    it('should respect MAX_ATTEMPTS limit', async () => {
      const jobData: MatchDeliveryJobData = {
        job: {
          id: mockDeliveryId,
          jobType: 'delivery',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'Jane Smith',
          customerPhone: '+234123456789',
          earnings: 3000,
          distanceKm: 5.2,
          packageDetails: 'Mixed items',
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchDeliveryJobData>;

      (prismaService.delivery.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Create 25 riders (more than MAX_ATTEMPTS = 20)
      const manyRiders = Array.from({ length: 25 }, (_, i) => `rider-${i}`);
      redisService.getRidersInHex.mockResolvedValue(manyRiders);

      // Mock all riders with locations
      const locations = manyRiders.map((id, i) => ({
        id,
        lat: 6.5245 + i * 0.001,
        lng: 3.3793 + i * 0.001,
        distanceKm: i * 0.1,
      }));

      manyRiders.forEach((id) => {
        redisService.getRiderState.mockResolvedValueOnce(
          createMockDriverState(id, 6.5245, 3.3793, mockHexId),
        );
      });

      geoService.sortByDistance.mockReturnValue(locations);

      // All riders fail atomic lock
      const mockEval = jest.fn().mockResolvedValue(0);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      // Return MAX_MATCHING_RETRIES (5) so the cancel branch is taken
      redisService.incrementMatchingAttempts.mockResolvedValue(5);
      (prismaService.delivery.update as jest.Mock).mockResolvedValue({} as any);

      await processor.process(job);

      // Should stop at MAX_ATTEMPTS (20), not try all 25
      expect(mockEval).toHaveBeenCalledTimes(20);

      // Should cancel delivery
      expect(prismaService.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });
  });
});
