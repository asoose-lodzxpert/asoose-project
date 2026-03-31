import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Test Suite: Store Orders Isolation
 * ──────────────────────────────────────────────────────────────────
 * Verifies that store-specific orders are properly isolated:
 * - Admin-managed store orders appear ONLY in Store Orders view
 * - Admin-managed store orders do NOT appear in global Orders view
 * - Regular store orders continue to appear in global Orders view
 * - No regression in filtering by status, type, search, etc.
 */
describe('Orders Isolation (store orders vs global orders)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /super-admin/orders (Global Orders View)', () => {
    it('should NOT include orders from admin-managed stores', async () => {
      // This test verifies the bugfix:
      // Store orders should NOT appear in the global Orders view
      
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');

      // Verify that no returned orders are from admin-managed stores
      const orders = response.body.data || [];
      
      // For each order, check that its store is NOT admin-managed
      for (const order of orders) {
        // The order should have store information (vendor field)
        expect(order).toHaveProperty('vendor');
        
        // Query the actual store to verify it's not admin-managed
        const store = await prisma.store.findUnique({
          where: { id: order.storeId || '' },
        });

        // If the store exists, it should NOT be admin-managed
        if (store) {
          expect(store.isAdminManaged).toBe(false);
        }
      }
    });

    it('should include orders from regular (non-admin-managed) stores', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');

      // Verify pagination metadata
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
      expect(response.body.meta).toHaveProperty('pages');
    });

    it('should respect status filter and NOT show admin-managed store orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ status: 'PENDING', page: 1, limit: 100 });

      expect(response.status).toBe(200);
      const orders = response.body.data || [];

      // All returned orders should be PENDING and NOT from admin-managed stores
      for (const order of orders) {
        expect(order.status).toBe('PENDING');
        
        const store = await prisma.store.findUnique({
          where: { id: order.storeId || '' },
        });

        if (store) {
          expect(store.isAdminManaged).toBe(false);
        }
      }
    });

    it('should respect type filter and NOT show admin-managed store orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ type: 'Food', page: 1, limit: 100 });

      expect(response.status).toBe(200);
      const orders = response.body.data || [];

      // All returned orders should be from Food stores and NOT admin-managed
      for (const order of orders) {
        expect(order.type).toBe('Food');
        
        const store = await prisma.store.findUnique({
          where: { id: order.storeId || '' },
        });

        if (store) {
          expect(store.isAdminManaged).toBe(false);
        }
      }
    });
  });

  describe('GET /super-admin/orders/store-orders (Store Orders View)', () => {
    it('should ONLY include orders from admin-managed stores', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders/store-orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('managedStores');

      // Verify that ALL returned orders are from admin-managed stores
      const orders = response.body.data || [];
      
      for (const order of orders) {
        // Order store info should indicate it's admin-managed
        if (order.store) {
          expect(order.store.isAdminManaged).toBe(true);
        }
        
        // Verify via database
        const store = await prisma.store.findUnique({
          where: { id: order.store?.id || order.storeId || '' },
        });

        if (store) {
          expect(store.isAdminManaged).toBe(true);
        }
      }
    });

    it('should include managedStores in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders/store-orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('managedStores');
      expect(Array.isArray(response.body.managedStores)).toBe(true);

      // Each managed store should have required properties
      response.body.managedStores?.forEach((store: any) => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('name');
      });
    });

    it('should filter by storeId when provided', async () => {
      // Get a managed store first
      const storesResponse = await request(app.getHttpServer())
        .get('/v1/super-admin/orders/store-orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 1 });

      if (storesResponse.body.managedStores?.length > 0) {
        const storeId = storesResponse.body.managedStores[0].id;

        // Get orders for specific store
        const response = await request(app.getHttpServer())
          .get('/v1/super-admin/orders/store-orders')
          .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
          .query({ storeId, page: 1, limit: 100 });

        expect(response.status).toBe(200);
        const orders = response.body.data || [];

        // All orders should be from the specified store
        if (orders.length > 0) {
          orders.forEach((order: any) => {
            expect(order.store?.id || order.storeId).toBe(storeId);
          });
        }
      }
    });

    it('should filter by status and ONLY show admin-managed store orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/super-admin/orders/store-orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ status: 'PENDING', page: 1, limit: 100 });

      expect(response.status).toBe(200);
      const orders = response.body.data || [];

      // All orders should be PENDING and from admin-managed stores
      for (const order of orders) {
        expect(order.status).toBe('PENDING');

        const store = await prisma.store.findUnique({
          where: { id: order.store?.id || order.storeId || '' },
        });

        if (store) {
          expect(store.isAdminManaged).toBe(true);
        }
      }
    });
  });

  describe('Isolation Verification', () => {
    it('should not have any order appear in both views', async () => {
      // Get orders from global view
      const globalResponse = await request(app.getHttpServer())
        .get('/v1/super-admin/orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 100 });

      const globalOrderIds = new Set(
        (globalResponse.body.data || []).map((o: any) => o.id),
      );

      // Get orders from store view
      const storeResponse = await request(app.getHttpServer())
        .get('/v1/super-admin/orders/store-orders')
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .query({ page: 1, limit: 100 });

      const storeOrderIds = new Set(
        (storeResponse.body.data || []).map((o: any) => o.id),
      );

      // Find intersection - there should be no overlap
      const overlap = Array.from(globalOrderIds).filter((id) =>
        storeOrderIds.has(id),
      );

      expect(overlap).toHaveLength(0);
    });
  });
});
