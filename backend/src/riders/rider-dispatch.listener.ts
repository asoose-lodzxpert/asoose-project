import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFacade } from '../users/notification.facade'; 

@Injectable()
export class RiderDispatchListener {
  private readonly logger = new Logger(RiderDispatchListener.name);

  constructor(
    private prisma: PrismaService,
    private notificationFacade: NotificationFacade 
  ) {}

  @OnEvent('order.ready')
  async handleOrderReadyEvent(payload: { orderId: string; storeId: string }) {
    this.logger.log(`Received dispatch request for Order ${payload.orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { delivery: true, store: true }
    });

    if (!order || !order.delivery) {
      this.logger.error(`Order ${payload.orderId} has no delivery record!`);
      return;
    }

    const nearbyRiders = await this.prisma.riderProfile.findMany({
      where: { isOnline: true },
      take: 5
    });

    if (nearbyRiders.length === 0) {
      this.logger.warn(`No riders found for Order ${payload.orderId}`);
      return;
    }

    const selectedRider = nearbyRiders[0];
    
    await this.prisma.delivery.update({
      where: { id: order.delivery.id },
      data: {
        riderProfileId: selectedRider.id,
        status: 'ASSIGNED',
        assignedAt: new Date()
      }
    });

    // [!code ++] NOTIFY THE RIDER
    await this.notificationFacade.sendInAppNotification(
      selectedRider.userId,
      'New Delivery Assigned',
      `Pick up order #${payload.orderId.slice(0,8)} at ${order.store.name}`,
      { orderId: payload.orderId, type: 'DELIVERY_ASSIGNED' }
    );

    this.logger.log(`Rider ${selectedRider.id} assigned and notified for Order ${payload.orderId}`);
  }
}