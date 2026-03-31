import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Test Suite: Order Status & Rider Assignment Decoupling
 * ──────────────────────────────────────────────────────────────────
 * Verifies that assigning a rider to a delivery does NOT automatically
 * change the order status. Order status transitions should only occur
 * through explicit lifecycle actions (accept, prepare, ready, dispatch).
 */
describe('Orders - Rider Assignment and Status Decoupling (e2e)', () => {
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

  describe('Single Rider Assignment', () => {
    it('should NOT change order status when rider is assigned to delivery', async () => {
      // Preconditions: Create order in READY status
      const order = await prisma.order.findFirst({
        where: { status: 'READY' },
      });

      if (!order) {
        console.warn('No READY order found for test - skipping');
        return;
      }

      const statusBefore = order.status;
      const delivery = await prisma.delivery.findFirst({
        where: { orderId: order.id },
      });

      if (!delivery) {
        console.warn('No delivery found for order - skipping');
        return;
      }

      // Get an active rider
      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider found - skipping');
        return;
      }

      // Action: Assign rider to delivery
      await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id })
        .expect(200);

      // Verification: Order status should NOT have changed
      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
      });

      expect(orderAfter?.status).toBe(statusBefore);
      expect(orderAfter?.status).not.toBe('DISPATCHED');
    });

    it('should maintain READY status after rider assignment', async () => {
      const order = await prisma.order.findFirst({
        where: { status: 'READY' },
      });

      if (!order) {
        console.warn('No READY order found for test - skipping');
        return;
      }

      const delivery = await prisma.delivery.findFirst({
        where: { orderId: order.id },
      });

      if (!delivery) {
        console.warn('No delivery found for order - skipping');
        return;
      }

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider found - skipping');
        return;
      }

      // Assign rider
      await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id })
        .expect(200);

      // Verify delivery is ASSIGNED but order stays READY
      const deliveryAfter = await prisma.delivery.findUnique({
        where: { id: delivery.id },
      });
      expect(deliveryAfter?.status).toBe('ASSIGNED');

      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(orderAfter?.status).toBe('READY');
    });

    it('should handle rider reassignment without changing order status', async () => {
      const order = await prisma.order.findFirst({
        where: { status: 'READY' },
      });

      if (!order) {
        console.warn('No READY order found for test - skipping');
        return;
      }

      const delivery = await prisma.delivery.findFirst({
        where: { orderId: order.id },
      });

      if (!delivery) {
        console.warn('No delivery found for order - skipping');
        return;
      }

      const riders = await prisma.rider.findMany({
        where: { status: 'ACTIVE' },
        take: 2,
      });

      if (riders.length < 2) {
        console.warn('Need 2 active riders for reassignment test - skipping');
        return;
      }

      // First assignment
      let response = await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: riders[0].id });
      expect(response.status).toBe(200);

      let orderAfterFirstAssignment = await prisma.order.findUnique({
        where: { id: order.id },
      });
      const statusAfterFirstAssignment = orderAfterFirstAssignment?.status;

      // Unassign
      await request(app.getHttpServer())
        .patch(`/v1/super-admin/deliveries/${delivery.id}`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: null })
        .expect(200);

      // Second assignment (reassignment)
      response = await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: riders[1].id });
      expect(response.status).toBe(200);

      let orderAfterReassignment = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // Order status should still be the same (not changed to DISPATCHED)
      expect(orderAfterReassignment?.status).toBe(statusAfterFirstAssignment);
      expect(orderAfterReassignment?.status).not.toBe('DISPATCHED');
    });
  });

  describe('Group Delivery Assignment', () => {
    it('should NOT change order statuses when assigning rider to group delivery', async () => {
      // Find an order group with multiple READY orders
      const orderGroup = await prisma.orderGroup.findFirst({
        include: {
          orders: true,
        },
      });

      if (!orderGroup || orderGroup.orders.length === 0) {
        console.warn('No order group found - skipping');
        return;
      }

      // Capture statuses before assignment
      const statusesBefore = new Map(
        orderGroup.orders.map((o) => [o.id, o.status]),
      );

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider found - skipping');
        return;
      }

      // Assign rider to group
      await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/groups/${orderGroup.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id })
        .expect(200);

      // Verify each order maintains its status
      for (const orderId of orderGroup.orders.map((o) => o.id)) {
        const orderAfter = await prisma.order.findUnique({
          where: { id: orderId },
        });

        const statusBefore = statusesBefore.get(orderId);
        expect(orderAfter?.status).toBe(statusBefore);
        expect(orderAfter?.status).not.toBe('DISPATCHED');
      }
    });

    it('should NOT prematurely dispatch orders in group when rider assigned', async () => {
      const orderGroup = await prisma.orderGroup.findFirst({
        where: {
          orders: {
            some: { status: 'READY' },
          },
        },
        include: {
          orders: true,
        },
      });

      if (!orderGroup) {
        console.warn('No order group with READY orders - skipping');
        return;
      }

      // All orders should be READY (not DISPATCHED)
      const readyOrders = orderGroup.orders.filter((o) => o.status === 'READY');
      expect(readyOrders.length).toBeGreaterThan(0);

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider - skipping');
        return;
      }

      // Assign rider
      await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/groups/${orderGroup.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id })
        .expect(200);

      // Verify READY orders are still READY (not changed to DISPATCHED)
      for (const order of readyOrders) {
        const orderAfter = await prisma.order.findUnique({
          where: { id: order.id },
        });
        expect(orderAfter?.status).toBe('READY');
      }
    });
  });

  describe('Order Status Transitions - Explicit Actions Only', () => {
    it('should only transition status through explicit workflow actions', async () => {
      const order = await prisma.order.findFirst({
        where: { status: 'READY' },
        include: { delivery: true },
      });

      if (!order || !order.delivery) {
        console.warn('No READY order with delivery - skipping');
        return;
      }

      // Current status should be READY
      expect(order.status).toBe('READY');

      // Only explicit transitions should change status from READY
      // Examples: explicit dispatch action, pickup action, etc.
      // NOT automatic rider assignment

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider - skipping');
        return;
      }

      // Assign rider (should NOT trigger status change)
      await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${order.delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id })
        .expect(200);

      const orderAfterAssignment = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // Status should still be READY, not jumped to DISPATCHED
      expect(orderAfterAssignment?.status).toBe('READY');
    });
  });

  describe('Edge Cases', () => {
    it('should maintain order status for PENDING orders when rider assigned', async () => {
      const order = await prisma.order.findFirst({
        where: { status: 'PENDING' },
        include: { delivery: true },
      });

      if (!order || !order.delivery) {
        console.warn('No PENDING order with delivery - skipping');
        return;
      }

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider - skipping');
        return;
      }

      // Try to assign rider
      const response = await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${order.delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id });

      // Status code might vary based on business rules, but we check final status
      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // Order should NOT have been jumped to DISPATCHED
      expect(orderAfter?.status).not.toBe('DISPATCHED');
    });

    it('should maintain order status for PREPARING orders when rider assigned', async () => {
      const order = await prisma.order.findFirst({
        where: { status: 'PREPARING' },
        include: { delivery: true },
      });

      if (!order || !order.delivery) {
        console.warn('No PREPARING order with delivery - skipping');
        return;
      }

      const rider = await prisma.rider.findFirst({
        where: { status: 'ACTIVE' },
      });

      if (!rider) {
        console.warn('No active rider - skipping');
        return;
      }

      // Try to assign rider
      const response = await request(app.getHttpServer())
        .post(`/v1/super-admin/deliveries/${order.delivery.id}/assign-rider`)
        .set('Authorization', `Bearer ${process.env.TEST_ADMIN_TOKEN || ''}`)
        .send({ riderId: rider.id });

      const orderAfter = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // Order should NOT be jumped to DISPATCHED from PREPARING
      expect(orderAfter?.status).not.toBe('DISPATCHED');
    });
  });
});
