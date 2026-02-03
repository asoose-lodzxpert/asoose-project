import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface RiderEvent {
  type: 'job.assigned' | 'job.cancelled' | 'job.updated' | 'status.changed';
  riderId: string;
  jobId: string;
  jobType: 'RIDE' | 'DELIVERY';
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
          id: event.jobId,
          retry: 10000,
        }),
      ),
    );
  }

  emitJobAssigned(
    riderId: string,
    jobId: string,
    jobType: 'RIDE' | 'DELIVERY',
    jobData: any,
  ) {
    this.emitRiderEvent({
      type: 'job.assigned',
      riderId,
      jobId,
      jobType,
      data: jobData,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobUpdate(
    riderId: string,
    jobId: string,
    jobType: 'RIDE' | 'DELIVERY',
    jobData: any,
  ) {
    this.emitRiderEvent({
      type: 'job.updated',
      riderId,
      jobId,
      jobType,
      data: jobData,
      timestamp: new Date().toISOString(),
    });
  }

  emitJobCancelled(
    riderId: string,
    jobId: string,
    jobType: 'RIDE' | 'DELIVERY',
    reason: string,
  ) {
    this.emitRiderEvent({
      type: 'job.cancelled',
      riderId,
      jobId,
      jobType,
      data: { reason },
      timestamp: new Date().toISOString(),
    });
  }
}
