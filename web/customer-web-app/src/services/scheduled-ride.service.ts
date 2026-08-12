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
  passengerName?: string;
  passengerPhone?: string;
}

export class ScheduledRideService {
  static async bookRide(data: BookScheduledRideDto, token?: string, idempotencyKey?: string) {
    return ApiService.post<any>("/rides", {
      pickup: {
        latitude: data.pickupLocation.lat,
        longitude: data.pickupLocation.lng,
        address: data.pickupLocation.addressText,
      },
      dropoff: {
        latitude: data.dropoffLocation.lat,
        longitude: data.dropoffLocation.lng,
        address: data.dropoffLocation.addressText,
      },
      paymentMethod: "CARD",
      vehicleType: "SEDAN",
      isScheduled: true,
      scheduledAt: data.scheduledAt,
      idempotencyKey: idempotencyKey ?? `ride-${crypto.randomUUID()}`,
      bookedForOther: Boolean(data.passengerName || data.passengerPhone),
      passengerName: data.passengerName ?? null,
      passengerPhone: data.passengerPhone ?? null,
      passengerEmail: null,
    }, token);
  }

  static async getUpcomingRides(token?: string) {
    const result = await ApiService.get<{ rides: any[] }>(
      "/rides?page=1&limit=20",
      token,
    );
    return result.rides.filter((ride) => ride.isScheduled);
  }

  static async cancelRide(rideId: string, token?: string) {
    return ApiService.post(`/rides/${rideId}/cancel`, { reason: "Cancelled scheduled ride" }, token);
  }
}
