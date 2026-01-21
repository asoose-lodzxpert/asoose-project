import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface RiderEvent {
  type:
    | 'delivery.assigned'
    | 'delivery.cancelled'
    | 'delivery.updated'
    | 'ride.assigned'
    | 'ride.cancelled'
    | 'ride.updated'
    | 'status.changed';
  riderId: string;
  deliveryId?: string;
  rideId?: string;
  data: any;
  timestamp: string;
}

@Injectable()
export class RidersStreamService {
  private readonly logger = new Logger(RidersStreamService.name);
  private readonly riderEvents$ = new Subject<RiderEvent>();

  emitRiderEvent(event: RiderEvent) {
    this.logger.log(`Emitting ${event.type} for rider ${event.riderId}`);
    this.riderEvents$.next(event);
  }

  getRiderStream(riderId: string): Observable<MessageEvent> {
    this.logger.log(`Rider ${riderId} connected to event stream`);

    return this.riderEvents$.pipe(
      filter((event) => event.riderId === riderId),
      map(
        (event): MessageEvent => ({
          data: event.data,
          type: event.type,
          id: event.deliveryId || event.rideId || '',
          retry: 10000,
        }),
      ),
    );
  }

  emitDeliveryAssigned(riderId: string, deliveryId: string, deliveryData: any) {
    this.emitRiderEvent({
      type: 'delivery.assigned',
      riderId,
      deliveryId,
      data: deliveryData,
      timestamp: new Date().toISOString(),
    });
  }

  emitDeliveryUpdate(riderId: string, deliveryId: string, deliveryData: any) {
    this.emitRiderEvent({
      type: 'delivery.updated',
      riderId,
      deliveryId,
      data: deliveryData,
      timestamp: new Date().toISOString(),
    });
  }

  emitDeliveryCancelled(riderId: string, deliveryId: string, reason: string) {
    this.emitRiderEvent({
      type: 'delivery.cancelled',
      riderId,
      deliveryId,
      data: { reason },
      timestamp: new Date().toISOString(),
    });
  }

  emitRideAssigned(riderId: string, rideId: string, rideData: any) {
    this.emitRiderEvent({
      type: 'ride.assigned',
      riderId,
      rideId,
      data: rideData,
      timestamp: new Date().toISOString(),
    });
  }

  emitRideUpdate(riderId: string, rideId: string, rideData: any) {
    this.emitRiderEvent({
      type: 'ride.updated',
      riderId,
      rideId,
      data: rideData,
      timestamp: new Date().toISOString(),
    });
  }

  emitRideCancelled(riderId: string, rideId: string, reason: string) {
    this.emitRiderEvent({
      type: 'ride.cancelled',
      riderId,
      rideId,
      data: { reason },
      timestamp: new Date().toISOString(),
    });
  }
}
