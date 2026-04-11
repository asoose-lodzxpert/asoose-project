import { ApiService } from "./api.service";

export interface LocationPayload {
  addressText: string;
  placeId?: string;
  lat?: number;
  lng?: number;
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
  static async bookRide(data: BookScheduledRideDto, token?: string, idempotencyKey?: string) {
    return ApiService.post("/scheduled-rides", data, token, {
      headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : undefined
    });
  }

  static async getUpcomingRides(token?: string) {
    return ApiService.get<any[]>("/scheduled-rides/upcoming", token);
  }

  static async cancelRide(rideId: string, token?: string) {
    return ApiService.patch(`/scheduled-rides/${rideId}/cancel`, {}, token);
  }

  static async rescheduleRide(rideId: string, data: { scheduledAt: string }, token?: string) {
    return ApiService.patch(`/scheduled-rides/${rideId}/reschedule`, data, token);
  }
}
