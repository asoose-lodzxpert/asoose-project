import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripsCommonService } from './trips.common.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../matching/redis/redis.service';
import { MapsService } from '../../maps/maps.service';

/**
 * Geofence validation tests for TripsCommonService.validateGeofence()
 *
 * Tests cover:
 * - Known in-zone coordinates (Maiduguri only — by product design)
 * - Known out-of-zone coordinates
 * - Boundary coordinates
 * - Invalid coordinates
 * - No-zones-configured fail-open behavior
 */
describe('TripsCommonService - Geofence Validation', () => {
  let service: TripsCommonService;
  let prismaService: { serviceZone: { findMany: jest.Mock } };

  const MAIDUGURI_ZONE = {
    name: 'Maiduguri',
    coordinates: [
      { lat: 11.7, lng: 13.0 },
      { lat: 11.7, lng: 13.3 },
      { lat: 11.95, lng: 13.3 },
      { lat: 11.95, lng: 13.0 },
    ],
  };

  beforeEach(async () => {
    prismaService = {
      serviceZone: {
        findMany: jest.fn().mockResolvedValue([MAIDUGURI_ZONE]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsCommonService,
        { provide: PrismaService, useValue: prismaService },
        {
          provide: RedisService,
          useValue: {
            getClient: () => ({ incr: jest.fn(), expire: jest.fn() }),
          },
        },
        { provide: MapsService, useValue: {} },
      ],
    }).compile();

    service = module.get<TripsCommonService>(TripsCommonService);
  });

  // ── Known In-Zone Coordinates (Maiduguri) ──

  it('should ACCEPT Maiduguri center (11.8311, 13.151)', async () => {
    await expect(
      service.validateGeofence(11.8311, 13.151),
    ).resolves.toBeUndefined();
  });

  it('should ACCEPT Maiduguri university area (11.85, 13.10)', async () => {
    await expect(
      service.validateGeofence(11.85, 13.1),
    ).resolves.toBeUndefined();
  });

  // ── Known Out-of-Zone Coordinates ──

  it('should REJECT Lagos (6.5244, 3.3792) — outside Maiduguri', async () => {
    await expect(service.validateGeofence(6.5244, 3.3792)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should REJECT Abuja (9.0579, 7.4951) — outside Maiduguri', async () => {
    await expect(service.validateGeofence(9.0579, 7.4951)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should REJECT London (51.5074, -0.1278) — not in Nigeria', async () => {
    await expect(service.validateGeofence(51.5074, -0.1278)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should include zone name in error message', async () => {
    await expect(service.validateGeofence(0, 0)).rejects.toThrow(/Maiduguri/);
  });

  // ── Boundary Coordinates ──

  it('should ACCEPT a point just inside Maiduguri SW corner', async () => {
    await expect(
      service.validateGeofence(11.71, 13.01),
    ).resolves.toBeUndefined();
  });

  it('should REJECT a point just outside Maiduguri SW corner', async () => {
    await expect(service.validateGeofence(11.69, 12.99)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ── Invalid Coordinates ──

  it('should REJECT latitude > 90', async () => {
    await expect(service.validateGeofence(91, 3.4)).rejects.toThrow(
      'Invalid coordinates',
    );
  });

  it('should REJECT longitude < -180', async () => {
    await expect(service.validateGeofence(6.5, -181)).rejects.toThrow(
      'Invalid coordinates',
    );
  });

  // ── No Zones Configured (Fail-Open) ──

  it('should ACCEPT any valid coordinate when no zones exist', async () => {
    prismaService.serviceZone.findMany.mockResolvedValue([]);
    // Bust cache by accessing private field
    (service as any).serviceZonesCache = null;

    await expect(service.validateGeofence(6.5, 3.4)).resolves.toBeUndefined();
    await expect(
      service.validateGeofence(40.7128, -74.006),
    ).resolves.toBeUndefined();
  });

  // ── Caching ──

  it('should cache zones and not re-query DB on second call', async () => {
    await service.validateGeofence(11.83, 13.15);
    await service.validateGeofence(11.85, 13.1);

    expect(prismaService.serviceZone.findMany).toHaveBeenCalledTimes(1);
  });
});
