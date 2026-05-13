import { request, get, post, patch } from "@/lib/authFetch";
import {
  Ride,
  CreateRidePayload,
  RideEstimatePayload,
  CancelRidePayload,
  DriverLocation,
} from "@/types/ride";

export class RideService {
  /**
   * Get fare estimate for a ride
   * Uses /fare/ride endpoint as specified
   */
  static async estimateRide(payload: RideEstimatePayload): Promise<{
    price: any;
    economyPrice?: any;
    businessPrice?: any;
    distance: { meters: number; text: string };
    eta: { seconds: number; text: string };
  }> {
    // Transform to backend DTO format
    const dto = {
      pickuplat: String(payload.pickupLat),
      pickuplong: String(payload.pickupLng),
      dropofflat: String(payload.dropoffLat),
      dropofflong: String(payload.dropoffLng),
      ...(payload.vehicleType ? { vehicleType: payload.vehicleType } : {}),
    };
    return post("fare/ride", dto);
  }

  /**
   * Request a new ride (creates ride in PENDING status)
   */
  static async requestRide(payload: CreateRidePayload): Promise<{
    ride: Ride;
    payment: any;
    message: string;
  }> {
    const idempotencyKey = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const dto = {
      pickupLocation: {
        addressText:
          payload.pickupLocation.address?.trim() || "Unknown location",
        lat: Number(payload.pickupLocation.latitude),
        lng: Number(payload.pickupLocation.longitude),
      },

      dropoffLocation: {
        addressText:
          payload.dropoffLocation.address?.trim() || "Unknown location",
        lat: Number(payload.dropoffLocation.latitude),
        lng: Number(payload.dropoffLocation.longitude),
      },

      vehicleType: payload.vehicleType,

      fare: Number(payload.fare),
      distanceKm: Number(payload.distanceKm),
      durationMin: Number(payload.durationMin),

      // Optional
      ...(payload.notes?.trim() && {
        notes: payload.notes.trim(),
      }),
      ...(payload.passengerName?.trim() && {
        passengerName: payload.passengerName.trim(),
      }),
      ...(payload.passengerPhone?.trim() && {
        passengerPhone: payload.passengerPhone.trim(),
      }),
    };

    if (__DEV__)
      console.log(
        "Requesting ride with payload:",
        JSON.stringify(dto, null, 2),
        `\n[x-idempotency-key: ${idempotencyKey}]`,
      );

    // Pass idempotency key in header
    return post("trips/rides/request", dto, {
      headers: { "x-idempotency-key": idempotencyKey },
    });
  }

  /**
   * Confirm ride payment (transitions to REQUESTED and triggers driver matching)
   */
  static async confirmRide(
    rideId: string,
    paymentMethod: "CASH" | "CARD",
  ): Promise<{ status: string; rideId: string }> {
    return post(`trips/rides/${rideId}/confirm`, { paymentMethod });
  }

  /**
   * Get current active ride for the user
   */
  static async getCurrentRide(): Promise<Ride | null> {
    try {
      const ride = await get("trips/rides/current");
      return ride || null;
    } catch (error: any) {
      if (
        error?.message?.includes("not found") ||
        error?.message?.includes("404")
      ) {
        return null;
      }
      throw error;
    }
  }

  /*
   * Get specific ride by ID
   */
  static async getRideById(rideId: string): Promise<Ride> {
    return get(`trips/rides/${rideId}`);
  }

  /**
   * Cancel an active ride
   */
  static async cancelRide(
    rideId: string,
    payload: CancelRidePayload,
  ): Promise<{ message: string }> {
    return patch(`trips/rides/${rideId}/cancel`, payload);
  }

  /**
   * Get driver's current location
   */
  static async getDriverLocation(
    rideId: string,
  ): Promise<DriverLocation | null> {
    return get(`trips/rides/${rideId}/driver-location`);
  }

  /**
   * Get user's ride history
   */
  static async getUserRides(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<Ride[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set("status", params.status);
    if (params?.page) queryParams.set("page", String(params.page));
    if (params?.limit) queryParams.set("limit", String(params.limit));

    const query = queryParams.toString();
    return get(`trips/rides${query ? `?${query}` : ""}`);
  }

  /**
   * Rate a completed ride driver
   * POST /trips/rides/:id/rate
   */
  static async rateRide(
    rideId: string,
    rating: number,
    comment?: string,
  ): Promise<{ message: string }> {
    return post(`trips/rides/${rideId}/rate`, {
      rating,
      ...(comment?.trim() ? { comment: comment.trim() } : {}),
    });
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format duration in minutes to readable string
   */
  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${mins} min`;
  }

  /**
   * Format distance in km to readable string
   */
  static formatDistance(km: number): string {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }

  /**
   * Get vehicle type display name
   */
  static getVehicleTypeName(type: string): string {
    const names: Record<string, string> = {
      ECONOMY: "Economy",
      BUSINESS: "Business",
    };
    return names[type] || type;
  }

  /**
   * Get vehicle type description
   */
  static getVehicleTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      ECONOMY: "Affordable and comfortable",
      BUSINESS: "Premium experience",
    };
    return descriptions[type] || "";
  }

  /**
   * Mask phone number for privacy
   */
  static maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 4) return phone;
    const last4 = phone.slice(-4);
    const masked = "*".repeat(Math.max(0, phone.length - 4));
    return masked + last4;
  }
}
