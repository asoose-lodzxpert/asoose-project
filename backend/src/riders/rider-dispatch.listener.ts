import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFacade } from '../users/notification.facade';
import { TripsService } from '../users/trips/trips.service';
import { RidersStreamService } from './riders-stream.service';

@Injectable()
export class RiderDispatchListener {
  private readonly logger = new Logger(RiderDispatchListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationFacade: NotificationFacade,
    private tripsService: TripsService,
    private ridersStreamService: RidersStreamService,
  ) {}

  @OnEvent('order.ready')
  async handleOrderReadyEvent(payload: { orderId: string; storeId: string }) {
    this.logger.log(`Received dispatch request for Order ${payload.orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { delivery: true, store: true },
    });

    if (!order || !order.delivery) {
      this.logger.error(`Order ${payload.orderId} has no delivery record!`);
      return;
    }

    const nearbyRiders = await this.prisma.rider.findMany({
      where: { isOnline: true },
      take: 5,
      select: {
        id: true,
        name: true,
        fcmToken: true,
      },
    });

    if (nearbyRiders.length === 0) {
      this.logger.warn(`No riders found for Order ${payload.orderId}`);
      return;
    }

    const selectedRider = nearbyRiders[0];

    await this.tripsService.assignDriver(order.delivery.id, selectedRider.id);

    const deliveryData = {
      id: order.delivery.id,
      orderId: payload.orderId,
      storeName: order.store.name,
      storeAddress: order.store.address,
      customerName: order.delivery.recipientName,
      customerPhone: order.delivery.recipientPhone,
      deliveryFee: order.delivery.deliveryFee,
      packageDetails: order.delivery.packageDetails,
      pickupAddress: order.delivery.pickupAddressId,
      dropoffAddress: order.delivery.dropoffAddressId,
    };

    this.ridersStreamService.emitDeliveryAssigned(
      selectedRider.id,
      order.delivery.id,
      deliveryData,
    );

    await this.notificationFacade.notifyRider(
      selectedRider.id,
      'New Delivery Assigned',
      `Pick up order #${payload.orderId.slice(0, 8)} at ${order.store.name}`,
      { orderId: payload.orderId, type: 'DELIVERY_ASSIGNED' },
    );

    this.logger.log(
      `Rider ${selectedRider.id} assigned and notified for Order ${payload.orderId}`,
    );
  }
}
