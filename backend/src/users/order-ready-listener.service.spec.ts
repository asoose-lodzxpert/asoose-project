import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { OrderReadyListenerService } from './order-ready-listener.service';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from './trips/trips.service';

/**
 * OrderReadyListenerService Unit Tests
 *
 * Covers the business-critical fix that moves delivery matching from
 * payment time to after vendor(s) have marked order(s) READY.
 */
describe('OrderReadyListenerService', () => {
  let service: OrderReadyListenerService;
  let prisma: jest.Mocked<PrismaService>;
  let tripsService: jest.Mocked<TripsService>;

  // ─── shared fixtures ──────────────────────────────────────────────
  const ORDER_ID = 'order-aaa';
  const DELIVERY_ID = 'delivery-bbb';
  const GROUP_ID = 'group-ccc';
  const GROUP_DELIVERY_ID = 'delivery-group-ddd';

  beforeEach(async () => {
    // Build a typed mock for PrismaService with only the accessors used
    const prismaMock = {
      order: {
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      delivery: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderReadyListenerService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: TripsService,
          useValue: {
            startDeliveryMatching: jest.fn(),
          },
        },
      ],
    }).compile();

    // Suppress logger noise in CI
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = module.get<OrderReadyListenerService>(OrderReadyListenerService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    tripsService = module.get(TripsService) as jest.Mocked<TripsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Guard: order not found
  // ═══════════════════════════════════════════════════════════════════
  describe('order lookup fails', () => {
    it('does nothing when order does not exist in DB', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: ORDER_ID },
        select: {
          id: true,
          orderGroupId: true,
          delivery: { select: { id: true, status: true } },
        },
      });
      expect(tripsService.startDeliveryMatching).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Single-vendor order path
  // ═══════════════════════════════════════════════════════════════════
  describe('single-vendor order (no orderGroupId)', () => {
    it('calls startDeliveryMatching with the linked delivery id', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: null,
        delivery: { id: DELIVERY_ID, status: 'READY' },
      });
      (tripsService.startDeliveryMatching as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(tripsService.startDeliveryMatching).toHaveBeenCalledTimes(1);
      expect(tripsService.startDeliveryMatching).toHaveBeenCalledWith(
        DELIVERY_ID,
      );
    });

    it('skips matching when no delivery is linked to the single order', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: null,
        delivery: null, // no delivery
      });

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(tripsService.startDeliveryMatching).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Multi-vendor group order path
  // ═══════════════════════════════════════════════════════════════════
  describe('group order (orderGroupId present)', () => {
    it('does NOT trigger matching when only 1 of 2 vendors is ready', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });

      // readyCount = 1, totalCount = 2
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(1) // READY count
        .mockResolvedValueOnce(2); // total count

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(tripsService.startDeliveryMatching).not.toHaveBeenCalled();
    });

    it('triggers matching when ALL vendors in a group are ready', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });

      // readyCount = 2, totalCount = 2
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);

      (prisma.delivery.findFirst as jest.Mock).mockResolvedValue({
        id: GROUP_DELIVERY_ID,
        status: 'REQUESTED',
      });
      (tripsService.startDeliveryMatching as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(tripsService.startDeliveryMatching).toHaveBeenCalledTimes(1);
      expect(tripsService.startDeliveryMatching).toHaveBeenCalledWith(
        GROUP_DELIVERY_ID,
      );
    });

    it('queries both READY count and total count for the correct group', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);
      (prisma.delivery.findFirst as jest.Mock).mockResolvedValue({
        id: GROUP_DELIVERY_ID,
        status: 'REQUESTED',
      });

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      // First call: READY count
      expect(prisma.order.count).toHaveBeenNthCalledWith(1, {
        where: { orderGroupId: GROUP_ID, status: 'READY' },
      });
      // Second call: total count
      expect(prisma.order.count).toHaveBeenNthCalledWith(2, {
        where: { orderGroupId: GROUP_ID },
      });
    });

    it('uses orderGroupId to find the shared group delivery', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(3);
      (prisma.delivery.findFirst as jest.Mock).mockResolvedValue({
        id: GROUP_DELIVERY_ID,
        status: 'REQUESTED',
      });

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(prisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { orderGroupId: GROUP_ID },
        select: { id: true, status: true },
      });
    });

    it('skips matching when all vendors are ready but no delivery is linked to the group', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });
      (prisma.order.count as jest.Mock)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2);
      (prisma.delivery.findFirst as jest.Mock).mockResolvedValue(null); // no delivery

      await service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' });

      expect(tripsService.startDeliveryMatching).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  Error isolation — handler must not propagate exceptions
  // ═══════════════════════════════════════════════════════════════════
  describe('error handling', () => {
    it('catches errors thrown by startDeliveryMatching without re-throwing', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: null,
        delivery: { id: DELIVERY_ID, status: 'READY' },
      });
      (tripsService.startDeliveryMatching as jest.Mock).mockRejectedValue(
        new Error('Queue is down'),
      );

      // Must resolve, not reject
      await expect(
        service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' }),
      ).resolves.toBeUndefined();
    });

    it('catches errors thrown by prisma.order.findUnique without re-throwing', async () => {
      (prisma.order.findUnique as jest.Mock).mockRejectedValue(
        new Error('DB connection error'),
      );

      await expect(
        service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' }),
      ).resolves.toBeUndefined();

      expect(tripsService.startDeliveryMatching).not.toHaveBeenCalled();
    });

    it('catches errors in group order count query without re-throwing', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: ORDER_ID,
        orderGroupId: GROUP_ID,
        delivery: null,
      });
      (prisma.order.count as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await expect(
        service.handleOrderReady({ orderId: ORDER_ID, storeId: 'store-x' }),
      ).resolves.toBeUndefined();
    });
  });
});
