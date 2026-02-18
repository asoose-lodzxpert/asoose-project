import { Injectable, Logger, MessageEvent, Inject } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NotificationsGateway } from '../../notifications/notifications.gateway';

export interface OrderEvent {
  type: 'order.created' | 'order.updated' | 'order.accepted' | 'order.declined';
  storeId: string;
  orderId: string;
  data: any;
  timestamp: string;
  vendorId?: string; // Optional vendor ID for direct WebSocket emission
}

@Injectable()
export class VendorOrdersStreamService {
  private readonly logger = new Logger(VendorOrdersStreamService.name);
  private readonly orderEvents$ = new Subject<OrderEvent>();

  constructor(
    @Inject(NotificationsGateway)
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Emit an order event to all listening vendors
   * Events are filtered by storeId before being sent to specific vendors
   */
  emitOrderEvent(event: OrderEvent) {
    this.logger.log(
      `Emitting ${event.type} for store ${event.storeId}, order ${event.orderId}`,
    );

    // Emit through RxJS Subject (for SSE connections)
    this.orderEvents$.next(event);

    // Also emit through WebSocket to vendor
    if (event.vendorId) {
      this.notificationsGateway.sendToVendor(event.vendorId, {
        type: event.type,
        data: event.data,
        orderId: event.orderId,
        storeId: event.storeId,
      });
    }
  }

  /**
   * Get an Observable stream of events for a specific store
   * This is what each vendor will subscribe to via SSE
   */
  getOrderStream(storeId: string): Observable<MessageEvent> {
    this.logger.log(`Vendor connected to order stream for store ${storeId}`);

    return this.orderEvents$.pipe(
      filter((event) => event.storeId === storeId),
      map(
        (event): MessageEvent => ({
          data: event.data,
          type: event.type,
          id: event.orderId,
          retry: 10000,
        }),
      ),
    );
  }

  /**
   * Emit a new order created event
   */
  emitNewOrder(
    storeId: string,
    orderId: string,
    orderData: any,
    vendorId?: string,
  ) {
    this.emitOrderEvent({
      type: 'order.created',
      storeId,
      orderId,
      data: orderData,
      timestamp: new Date().toISOString(),
      vendorId,
    });
  }

  /**
   * Emit order status update event
   */
  emitOrderUpdate(
    storeId: string,
    orderId: string,
    orderData: any,
    vendorId?: string,
  ) {
    this.emitOrderEvent({
      type: 'order.updated',
      storeId,
      orderId,
      data: orderData,
      timestamp: new Date().toISOString(),
      vendorId,
    });
  }
}
