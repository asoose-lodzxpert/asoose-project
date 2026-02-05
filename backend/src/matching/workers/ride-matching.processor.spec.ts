import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { RideMatchingProcessor } from './ride-matching.processor';
import { RedisService } from '../redis/redis.service';
import { GeoService } from '../geo/geo.service';
import { EventBusService } from '../events/event-bus.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchRideJobData } from '../queue/queue.constants';
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
  role: DriverRole.DRIVER,
  status: DriverStatus.ONLINE,
  hexId,
  lastSeen: Date.now(),
  currentJobId: null,
  currentJobType: null,
  pendingJobId: null,
  pendingJobType: null,
  location: { lat, lng },
});

describe('RideMatchingProcessor', () => {
  let processor: RideMatchingProcessor;
  let redisService: jest.Mocked<RedisService>;
  let geoService: jest.Mocked<GeoService>;
  let eventBusService: jest.Mocked<EventBusService>;
  let queueService: jest.Mocked<QueueService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockRideId = 'ride-123';
  const mockDriverId = 'driver-456';
  const mockHexId = '88283082fffffff';
  const mockPickupLat = 6.5244;
  const mockPickupLng = 3.3792;
  const mockDropoffLat = 6.4281;
  const mockDropoffLng = 3.4219;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RideMatchingProcessor,
        {
          provide: RedisService,
          useValue: {
            getDeclinedDrivers: jest.fn(),
            getDriversInHex: jest.fn(),
            getDriverState: jest.fn(),
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
          },
        },
        {
          provide: QueueService,
          useValue: {
            scheduleAssignmentTimeout: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            ride: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<RideMatchingProcessor>(RideMatchingProcessor);
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
    it('should skip processing if ride is not found', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue(null);

      await processor.process(job);

      expect(prismaService.ride.findUnique).toHaveBeenCalledWith({
        where: { id: mockRideId },
        select: { status: true, riderId: true },
      });
      expect(geoService.latLngToHex).not.toHaveBeenCalled();
    });

    it('should skip processing if ride is not in REQUESTED status', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'ASSIGNED',
        riderId: null,
      });

      await processor.process(job);

      expect(geoService.latLngToHex).not.toHaveBeenCalled();
    });

    it('should successfully match a ride to a driver', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      // Mock ride in REQUESTED status
      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      // Mock no declined drivers
      redisService.getDeclinedDrivers.mockResolvedValue([]);

      // Mock hex conversion
      geoService.latLngToHex.mockReturnValue(mockHexId);

      // Mock hex rings (only ring 0 with center hex)
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Mock drivers in hex
      redisService.getDriversInHex.mockResolvedValue([mockDriverId]);

      // Mock driver location
      redisService.getDriverState.mockResolvedValue(
        createMockDriverState(mockDriverId, 6.5245, 3.3793, mockHexId),
      );

      // Mock distance sorting
      geoService.sortByDistance.mockReturnValue([
        { id: mockDriverId, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
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

      // Verify driver was locked
      expect(mockEval).toHaveBeenCalled();

      // Verify assignment timeout was scheduled
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          job: expect.objectContaining({
            id: mockRideId,
            jobType: 'ride',
          }),
        }),
        90000, // TIMEOUT_MS
      );
    });

    it('should exclude declined drivers from matching', async () => {
      const declinedDriverId = 'driver-declined';
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      // Mock declined drivers list
      redisService.getDeclinedDrivers.mockResolvedValue([declinedDriverId]);

      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Mock drivers in hex including declined one
      redisService.getDriversInHex.mockResolvedValue([
        declinedDriverId,
        mockDriverId,
      ]);

      // Mock driver locations
      redisService.getDriverState
        .mockResolvedValueOnce(
          createMockDriverState(declinedDriverId, 6.5246, 3.3794, mockHexId),
        )
        .mockResolvedValueOnce(
          createMockDriverState(mockDriverId, 6.5245, 3.3793, mockHexId),
        );

      // Only non-declined driver should be in sorted list
      geoService.sortByDistance.mockReturnValue([
        { id: mockDriverId, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
      ]);

      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify declined drivers were retrieved
      expect(redisService.getDeclinedDrivers).toHaveBeenCalledWith(mockRideId);
    });

    it('should try next driver if first driver is not available', async () => {
      const driver1 = 'driver-1';
      const driver2 = 'driver-2';

      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);
      redisService.getDriversInHex.mockResolvedValue([driver1, driver2]);

      // Mock both drivers online
      redisService.getDriverState
        .mockResolvedValueOnce(
          createMockDriverState(driver1, 6.5245, 3.3793, mockHexId),
        )
        .mockResolvedValueOnce(
          createMockDriverState(driver2, 6.5247, 3.3795, mockHexId),
        );

      geoService.sortByDistance.mockReturnValue([
        { id: driver1, lat: 6.5245, lng: 3.3793, distanceKm: 0.1 },
        { id: driver2, lat: 6.5247, lng: 3.3795, distanceKm: 0.3 },
      ]);

      // First driver fails (0 = not available), second succeeds
      const mockEval = jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify eval was called twice
      expect(mockEval).toHaveBeenCalledTimes(2);

      // Verify timeout was scheduled for driver2
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalledTimes(1);
    });

    it('should handle no driver found scenario', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);

      // Mock all rings with no drivers
      geoService.getHexRings.mockReturnValue([
        [mockHexId],
        ['hex-ring1-1', 'hex-ring1-2'],
        ['hex-ring2-1', 'hex-ring2-2'],
      ]);

      redisService.getDriversInHex.mockResolvedValue([]);
      redisService.incrementMatchingAttempts.mockResolvedValue(1);

      (prismaService.ride.update as jest.Mock).mockResolvedValue({} as any);

      await processor.process(job);

      // Verify ride was cancelled
      expect(prismaService.ride.update).toHaveBeenCalledWith({
        where: { id: mockRideId },
        data: {
          status: 'CANCELLED',
          cancellationReason: 'No driver available',
          cancelledBy: 'SYSTEM',
          cancelledAt: expect.any(Date),
        },
      });

      // Verify job cancelled event was emitted
      expect(eventBusService.emitJobCancelled).toHaveBeenCalledWith({
        jobId: mockRideId,
        jobType: 'ride',
        reason: 'No driver available',
        cancelledBy: 'system',
        timestamp: expect.any(Number),
      });
    });

    it('should expand search through multiple hex rings', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
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

      // No drivers in ring 0 and ring 1, driver found in ring 2
      redisService.getDriversInHex
        .mockResolvedValueOnce([]) // ring 0
        .mockResolvedValueOnce([]) // ring 1, hex 1
        .mockResolvedValueOnce([]) // ring 1, hex 2
        .mockResolvedValueOnce([]) // ring 1, hex 3
        .mockResolvedValueOnce([mockDriverId]); // ring 2, hex 1

      redisService.getDriverState.mockResolvedValue(
        createMockDriverState(mockDriverId, 6.525, 3.38, 'hex-2-1'),
      );

      geoService.sortByDistance.mockReturnValue([
        { id: mockDriverId, lat: 6.525, lng: 3.38, distanceKm: 0.5 },
      ]);

      const mockEval = jest.fn().mockResolvedValue(1);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      await processor.process(job);

      // Verify getDriversInHex was called for multiple hexes
      expect(redisService.getDriversInHex).toHaveBeenCalledTimes(5);

      // Verify assignment was successful
      expect(queueService.scheduleAssignmentTimeout).toHaveBeenCalled();
    });

    it('should respect MAX_ATTEMPTS limit', async () => {
      const jobData: MatchRideJobData = {
        job: {
          id: mockRideId,
          jobType: 'ride',
          pickupAddress: { lat: mockPickupLat, lng: mockPickupLng },
          dropoffAddress: { lat: mockDropoffLat, lng: mockDropoffLng },
          customerName: 'John Doe',
          earnings: 5000,
          distanceKm: 10.5,
          status: 'requested',
        },
        attempt: 1,
      };

      const job = { data: jobData } as Job<MatchRideJobData>;

      (prismaService.ride.findUnique as jest.Mock).mockResolvedValue({
        status: 'REQUESTED',
        riderId: null,
      });

      redisService.getDeclinedDrivers.mockResolvedValue([]);
      geoService.latLngToHex.mockReturnValue(mockHexId);
      geoService.getHexRings.mockReturnValue([[mockHexId]]);

      // Create 25 drivers (more than MAX_ATTEMPTS = 20)
      const manyDrivers = Array.from({ length: 25 }, (_, i) => `driver-${i}`);
      redisService.getDriversInHex.mockResolvedValue(manyDrivers);

      // Mock all drivers with locations
      const locations = manyDrivers.map((id, i) => ({
        id,
        lat: 6.5245 + i * 0.001,
        lng: 3.3793 + i * 0.001,
        distanceKm: i * 0.1,
      }));

      manyDrivers.forEach((id) => {
        redisService.getDriverState.mockResolvedValueOnce(
          createMockDriverState(id, 6.5245, 3.3793, mockHexId),
        );
      });

      geoService.sortByDistance.mockReturnValue(locations);

      // All drivers fail atomic lock
      const mockEval = jest.fn().mockResolvedValue(0);
      redisService.getClient.mockReturnValue({ eval: mockEval } as any);

      redisService.incrementMatchingAttempts.mockResolvedValue(1);
      (prismaService.ride.update as jest.Mock).mockResolvedValue({} as any);

      await processor.process(job);

      // Should stop at MAX_ATTEMPTS (20), not try all 25
      expect(mockEval).toHaveBeenCalledTimes(20);

      // Should cancel ride
      expect(prismaService.ride.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });
  });
});
