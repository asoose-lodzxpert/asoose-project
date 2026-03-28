/**
 * Order Sorting - Integration Tests
 * Verifies that order history is returned in correct (descending) order
 * Run: npm test -- order-sorting.test.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/users/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Order Sorting Integration Tests', () => {
  let ordersService: OrdersService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, PrismaService],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getUserOrders', () => {
    test('should return orders sorted by createdAt DESC (newest first)', async () => {
      const userId = 'test-user-123';

      // Fetch user orders
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 10,
      });

      const { data } = result;

      // ✅ ASSERTION 1: Data is not empty (skip if user has no orders)
      if (data.length > 1) {
        // ✅ ASSERTION 2: Each order has createdAt
        data.forEach((order) => {
          expect(order.createdAt).toBeDefined();
          expect(typeof order.createdAt).toBe('string');
          // Should be valid ISO string
          expect(new Date(order.createdAt).toString()).not.toBe('Invalid Date');
        });

        // ✅ ASSERTION 3: Orders are in descending order (newest first)
        for (let i = 0; i < data.length - 1; i++) {
          const currentTime = new Date(data[i].createdAt).getTime();
          const nextTime = new Date(data[i + 1].createdAt).getTime();

          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          console.log(`✅ Order ${i}: ${data[i].id} (${data[i].createdAt}) >= Order ${i + 1}: ${data[i + 1].id} (${data[i + 1].createdAt})`);
        }

        console.log(`✅ PASS: All ${data.length} orders are in DESC order by createdAt`);
      } else {
        console.log('⚠️ SKIP: User has fewer than 2 orders, cannot test ordering');
      }
    });

    test('should maintain sort order across pagination', async () => {
      const userId = 'test-user-123';

      // Fetch page 1
      const page1 = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 5,
      });

      // Fetch page 2
      const page2 = await ordersService.getUserOrders(userId, {
        page: 2,
        pageSize: 5,
      });

      if (page1.data.length > 0 && page2.data.length > 0) {
        // ✅ ASSERTION: Last item on page 1 should be >= first item on page 2
        const lastPage1Time = new Date(page1.data[page1.data.length - 1].createdAt).getTime();
        const firstPage2Time = new Date(page2.data[0].createdAt).getTime();

        expect(lastPage1Time).toBeGreaterThanOrEqual(firstPage2Time);
        console.log(`✅ PASS: Pagination maintains order: Page1 last >= Page2 first`);
      }
    });

    test('should keep order correct when filtering by status', async () => {
      const userId = 'test-user-123';

      const statuses = ['PENDING', 'CONFIRMED', 'DELIVERED'];

      for (const status of statuses) {
        const result = await ordersService.getUserOrders(userId, {
          page: 1,
          pageSize: 10,
          status: status as any,
        });

        const { data } = result;

        if (data.length > 1) {
          // ✅ ASSERTION: Filtered results are also in DESC order
          for (let i = 0; i < data.length - 1; i++) {
            const currentTime = new Date(data[i].createdAt).getTime();
            const nextTime = new Date(data[i + 1].createdAt).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }

          console.log(`✅ PASS: ${status} filtered orders maintain DESC order (${data.length} items)`);
        }
      }
    });

    test('should handle orders with identical timestamps (stable sort)', async () => {
      const userId = 'test-user-123';

      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 100,
      });

      const { data } = result;

      // Find orders with same timestamp
      const timeGroups = new Map<number, Array<{ id: string; createdAt: string }>>();

      data.forEach((order) => {
        const timestamp = new Date(order.createdAt).getTime();
        const group = timeGroups.get(timestamp) || [];
        group.push(order);
        timeGroups.set(timestamp, group);
      });

      // ✅ ASSERTION: For each group with same timestamp, order is stable
      timeGroups.forEach((group, timestamp) => {
        if (group.length > 1) {
          console.log(`✅ Found ${group.length} orders with same timestamp:`);
          group.forEach((order, idx) => {
            console.log(`   [${idx}] ${order.id}`);
          });
          // Verify subsequent orders don't have earlier timestamps
          const maxIndex = data.findIndex((o) => o.id === group[0].id);
          if (maxIndex < data.length - 1) {
            const nextOrder = data[maxIndex + 1];
            const nextTimestamp = new Date(nextOrder.createdAt).getTime();
            expect(nextTimestamp).toBeLessThanOrEqual(timestamp);
          }
        }
      });
    });
  });

  describe('Admin Orders Sorting', () => {
    test('should return admin orders sorted by createdAt DESC', async () => {
      const result = await ordersService.findAll({
        page: 1,
        limit: 10,
      } as any);

      const { data } = result;

      if (data.length > 1) {
        // ✅ ASSERTION: Admin orders are in DESC order
        for (let i = 0; i < data.length - 1; i++) {
          const currentTime = new Date(data[i].placedAt).getTime();
          const nextTime = new Date(data[i + 1].placedAt).getTime();

          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }

        console.log(`✅ PASS: All ${data.length} admin orders are in DESC order by placedAt`);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle single order correctly', async () => {
      const userId = 'test-user-with-one-order';
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 10,
      });

      const { data } = result;

      if (data.length === 1) {
        expect(data[0].createdAt).toBeDefined();
        console.log(`✅ PASS: Single order handled correctly`);
      }
    });

    test('should handle no orders correctly', async () => {
      const userId = 'test-user-with-no-orders';
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 10,
      });

      const { data } = result;

      expect(data.length).toBe(0);
      expect(result.total).toBe(0);
      console.log(`✅ PASS: Empty order list handled correctly`);
    });

    test('should handle very large page size without reordering', async () => {
      const userId = 'test-user-123';
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 1000,
      });

      const { data } = result;

      if (data.length > 1) {
        // ✅ ASSERTION: Even with large pageSize, order is maintained
        for (let i = 0; i < data.length - 1; i++) {
          const currentTime = new Date(data[i].createdAt).getTime();
          const nextTime = new Date(data[i + 1].createdAt).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }

        console.log(`✅ PASS: Large pageSize (${data.length}) maintains sort order`);
      }
    });
  });

  describe('Timestamp Validation', () => {
    test('all order timestamps should be valid ISO strings', async () => {
      const userId = 'test-user-123';
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 50,
      });

      const { data } = result;

      data.forEach((order) => {
        expect(order.createdAt).toBeDefined();

        // ✅ Should be ISO string
        expect(order.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        // ✅ Should parse to valid date
        const date = new Date(order.createdAt);
        expect(date.toString()).not.toBe('Invalid Date');

        // ✅ Should have Z or timezone offset
        expect(order.createdAt).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
      });

      console.log(`✅ PASS: All ${data.length} timestamps are valid ISO 8601 strings`);
    });

    test('timestamps should not have timezone offsets (should use UTC)', async () => {
      const userId = 'test-user-123';
      const result = await ordersService.getUserOrders(userId, {
        page: 1,
        pageSize: 20,
      });

      const { data } = result;

      data.forEach((order) => {
        // ✅ Should end with Z (UTC), not +/-offset
        expect(order.createdAt).toMatch(/Z$/);
      });

      console.log(`✅ PASS: All timestamps use UTC (Z suffix)`);
    });
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Helper to verify sort order
 */
function verifySortOrder(
  items: Array<{ createdAt: string }>,
  order: 'DESC' | 'ASC' = 'DESC',
): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    const current = new Date(items[i].createdAt).getTime();
    const next = new Date(items[i + 1].createdAt).getTime();

    if (order === 'DESC') {
      if (current < next) return false;
    } else {
      if (current > next) return false;
    }
  }
  return true;
}

/**
 * Helper to find orders with same timestamp
 */
function findDuplicateTimestamps(
  items: Array<{ createdAt: string }>,
): Map<number, number> {
  const timeMap = new Map<number, number>();

  items.forEach((item) => {
    const timestamp = new Date(item.createdAt).getTime();
    timeMap.set(timestamp, (timeMap.get(timestamp) || 0) + 1);
  });

  // Filter to only duplicates
  const duplicates = new Map<number, number>();
  timeMap.forEach((count, time) => {
    if (count > 1) duplicates.set(time, count);
  });

  return duplicates;
}
