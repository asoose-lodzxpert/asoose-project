import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from './trips/trips.service';

interface OrderReadyPayload {
  orderId: string;
  storeId: string;
}

/**
 * Listens for the 'order.ready' event (emitted by VendorOrdersService.markReady)
 * and triggers delivery matching at the correct moment — after the vendor has
 * finished preparing the order, not at payment time.
 *
 * Single-vendor order  → triggers immediately when that order goes READY.
 * Multi-vendor group   → waits until ALL orders in the group are READY,
 *                        then triggers the single shared group delivery.
 */
@Injectable()
export class OrderReadyListenerService {
  private readonly logger = new Logger(OrderReadyListenerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
  ) {}

  @OnEvent('order.ready', { async: true })
  async handleOrderReady(payload: OrderReadyPayload): Promise<void> {
    const { orderId } = payload;
    this.logger.log(
      `order.ready received for order ${orderId} — evaluating delivery matching`,
    );

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderGroupId: true,
          delivery: { select: { id: true, status: true } },
        },
      });

      if (!order) {
        this.logger.warn(`order.ready: order ${orderId} not found — skipping`);
        return;
      }

      if (order.orderGroupId) {
        await this.handleGroupOrderReady(order.orderGroupId, orderId);
      } else {
        await this.handleSingleOrderReady(orderId, order.delivery);
      }
    } catch (err) {
      this.logger.error(`order.ready handler failed for order ${orderId}`, err);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  Single-vendor order: trigger matching immediately
  // ─────────────────────────────────────────────────────────────────
  private async handleSingleOrderReady(
    orderId: string,
    delivery: { id: string; status: string } | null,
  ): Promise<void> {
    if (!delivery) {
      this.logger.warn(
        `order.ready: no delivery linked to single order ${orderId} — skipping`,
      );
      return;
    }

    this.logger.log(
      `Single order ${orderId} ready — triggering matching for delivery ${delivery.id}`,
    );
    await this.tripsService.startDeliveryMatching(delivery.id);
  }

  // ─────────────────────────────────────────────────────────────────
  //  Multi-vendor group: only trigger when ALL orders are READY
  // ─────────────────────────────────────────────────────────────────
  private async handleGroupOrderReady(
    orderGroupId: string,
    triggeringOrderId: string,
  ): Promise<void> {
    const [readyCount, totalCount] = await Promise.all([
      this.prisma.order.count({
        where: { orderGroupId, status: 'READY' },
      }),
      this.prisma.order.count({
        where: { orderGroupId },
      }),
    ]);

    this.logger.log(
      `Group ${orderGroupId}: ${readyCount}/${totalCount} vendors ready (triggered by order ${triggeringOrderId})`,
    );

    if (readyCount < totalCount) {
      // Other vendors are still preparing — wait for them
      return;
    }

    // All vendors are ready — find the single shared group delivery
    const groupDelivery = await this.prisma.delivery.findFirst({
      where: { orderGroupId },
      select: { id: true, status: true },
    });

    if (!groupDelivery) {
      this.logger.warn(
        `order.ready: no delivery found for orderGroup ${orderGroupId}`,
      );
      return;
    }

    this.logger.log(
      `All ${totalCount} vendors ready in group ${orderGroupId} — triggering matching for delivery ${groupDelivery.id}`,
    );
    await this.tripsService.startDeliveryMatching(groupDelivery.id);
  }
}
