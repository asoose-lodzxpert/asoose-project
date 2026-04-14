import { request, get, post, patch } from "@/lib/authFetch";

export interface LocationPayload {
  addressText: string;
  lat: number;
  lng: number;
}

export interface BookScheduledRideDto {
  scheduledAt: string; // ISO UTC
  pickupLocation: LocationPayload;
  dropoffLocation: LocationPayload;
  vehicleType: string;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  platformFee?: number;
  totalFare?: number;
  distanceKm?: number;
  durationMin?: number;
}

export class ScheduledRideService {
  static async bookRide(data: BookScheduledRideDto, idempotencyKey?: string) {
    return post("scheduled-rides", data, {
      headers: idempotencyKey ? { "x-idempotency-key": idempotencyKey } : undefined
    });
  }

  static async getUpcomingRides() {
    return get<any[]>("scheduled-rides/upcoming");
  }

  static async cancelRide(rideId: string) {
    return patch(`scheduled-rides/${rideId}/cancel`, {});
  }

  static async rescheduleRide(rideId: string, data: { scheduledAt: string }) {
    return patch(`scheduled-rides/${rideId}/reschedule`, data);
  }
}
