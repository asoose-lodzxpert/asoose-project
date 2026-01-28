import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationFacade } from '../users/notification.facade';
import { TripsService } from '../users/trips/trips.service';
import { RidersStreamService } from './riders-stream.service';

@Injectable()
export class RiderDispatchListener {
  constructor(
    private prisma: PrismaService,
    private notificationFacade: NotificationFacade,
    private ridersStreamService: RidersStreamService,
  ) {}

  @OnEvent('job.assigned')
  async handleJobAssignedEvent(payload: {
    id: string;
    jobType: 'RIDE' | 'DELIVERY';
  }) {
    if (payload.jobType === 'DELIVERY') {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: payload.id },
        include: { order: { include: { store: true } } },
      });
      if (delivery && delivery.riderId && delivery.orderId) {
        this.ridersStreamService.emitJobAssigned(
          delivery.riderId,
          delivery.id,
          'DELIVERY',
          {
            ...delivery,
            store: delivery.order?.store,
          },
        );
        await this.notificationFacade.notifyRider(
          delivery.riderId,
          'New Delivery Assigned',
          `Pick up order #${delivery.orderId.slice(0, 8)} at ${delivery.order?.store?.name || 'Store'}`,
          { deliveryId: delivery.id, type: 'DELIVERY_ASSIGNED' },
        );
      }
    } else if (payload.jobType === 'RIDE') {
      const ride = await this.prisma.ride.findUnique({
        where: { id: payload.id },
        include: { customer: true },
      });
      if (ride && ride.riderId) {
        this.ridersStreamService.emitJobAssigned(
          ride.riderId,
          ride.id,
          'RIDE',
          ride,
        );
        await this.notificationFacade.notifyRider(
          ride.riderId,
          'New Ride Assigned',
          `New ride request from ${ride.customer?.name || 'Customer'}`,
          { rideId: ride.id, type: 'RIDE_ASSIGNED' },
        );
      }
    }
  }
}
