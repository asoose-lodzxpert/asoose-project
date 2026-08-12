import { ApiService } from "./api.service";

// ✅ FIX: Expanded interface to match Backend Prisma Model & UsersService response
export interface Delivery {
  id: string;
  trackingId?: string;
  status:
    | "PENDING"
    | "REQUESTED"
    | "ASSIGNED"
    | "ACCEPTED"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";
  deliveryFee: number;
  distanceKm?: number;
  durationMinutes?: number;
  size?: "SMALL" | "MEDIUM" | "LARGE";
  paymentMethod?: "WALLET" | "CARD";
  paymentStatus?: string;
  confirmationCode?: string;

  // Package Info
  packageDetails?: string;
  recipientName?: string;
  recipientPhone?: string;
  weightKg?: number;
  isFragile?: boolean;
  isPerishable?: boolean;
  containsLiquid?: boolean;
  declaredValue?: number;

  // Relations
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicle?: {
      model: string;
      color: string;
      plateNumber: string;
    };
  };
  pickupAddress?: {
    street: string;
    city: string;
    state?: string;
    address?: string;
  };
  dropoffAddress?: {
    street: string;
    city: string;
    state?: string;
    address?: string;
  };

  // Timestamps
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

/** Maps the real backend's ParcelStatus enum to the DeliveryStatus-shaped
 *  strings the rest of the app (page.tsx, socket handlers, polling) already
 *  compares against — keeps the UI layer unchanged. */
export function mapParcelStatus(status: string): Delivery["status"] {
  switch (status) {
    case "SEARCHING_RIDER":
      return "REQUESTED";
    case "RIDER_ASSIGNED":
      return "ASSIGNED";
    case "RIDER_ACCEPTED":
      return "ACCEPTED";
    case "CANCELLED_BY_USER":
    case "CANCELLED_BY_RIDER":
    case "CANCELLED_BY_SYSTEM":
      return "CANCELLED";
    case "PICKED_UP":
    case "IN_TRANSIT":
    case "DELIVERED":
    case "PENDING":
      return status;
    default:
      return "PENDING";
  }
}

/** SMALL/MEDIUM/LARGE is all the backend prices by — map the free-form
 *  weight input this UI collects onto that 3-tier scale. */
export function weightToParcelSize(
  weightKg: number | null | undefined,
): "SMALL" | "MEDIUM" | "LARGE" {
  const w = weightKg ?? 2.5;
  if (w <= 5) return "SMALL";
  if (w <= 20) return "MEDIUM";
  return "LARGE";
}

function mapParcelToDelivery(p: any): Delivery {
  return {
    id: p.id,
    trackingId: p.trackingId,
    status: mapParcelStatus(p.status),
    deliveryFee: p.fare ?? 0,
    distanceKm: p.distanceKm ?? p.distance,
    durationMinutes: p.estimatedDurationMinutes ?? p.duration,
    size: p.size,
    paymentMethod: p.paymentMethod,
    paymentStatus: p.paymentStatus,
    packageDetails: p.description ?? undefined,
    recipientName: p.recipientName,
    recipientPhone: p.recipientPhone,
    // Backend's ParcelRiderSummary is { name, vehicleType, phone, rating } —
    // no rider id or plate/color/model exposed on this endpoint.
    rider: p.rider
      ? {
          id: p.riderId ?? "",
          name: p.rider.name,
          phone: p.rider.phone ?? "",
          vehicle: p.rider.vehicleType
            ? { model: p.rider.vehicleType, color: "", plateNumber: "" }
            : undefined,
        }
      : undefined,
    pickupAddress: p.pickupAddress
      ? { ...p.pickupAddress, address: p.pickupAddress.address ?? p.pickupAddress.street }
      : undefined,
    dropoffAddress: p.dropoffAddress
      ? { ...p.dropoffAddress, address: p.dropoffAddress.address ?? p.dropoffAddress.street }
      : undefined,
    createdAt: p.createdAt,
    pickedUpAt: p.pickedUpAt,
    deliveredAt: p.deliveredAt,
  };
}

export interface ParcelLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ParcelEstimate {
  distanceKm: number;
  estimatedDurationMinutes: number;
  fare: number;
  sizeMultiplier: number;
}

export interface CreateParcelResult {
  delivery: Delivery;
  deliveryFee: number;
  authorizationUrl?: string;
  reference?: string;
  confirmationCode?: string;
}

export class DeliveryService {
  /** POST /parcels/estimate — fare preview before creating/paying for a parcel. */
  static async estimateParcel(
    pickup: ParcelLocation,
    dropoff: ParcelLocation,
    size: "SMALL" | "MEDIUM" | "LARGE",
    token?: string,
  ): Promise<ParcelEstimate> {
    return ApiService.post<ParcelEstimate>(
      "/parcels/estimate",
      { pickup, dropoff, size },
      token,
    );
  }

  /**
   * POST /parcels — creates AND pays for the parcel in one call (unlike the
   * old two-step create-then-initiate-payment flow). For CARD, the response
   * includes a Paystack authorizationUrl to redirect to.
   */
  static async createDelivery(
    data: {
      pickup: ParcelLocation;
      dropoff: ParcelLocation;
      size: "SMALL" | "MEDIUM" | "LARGE";
      recipientName: string;
      recipientPhone: string;
      description?: string;
      paymentMethod: "WALLET" | "CARD";
      idempotencyKey?: string;
    },
    token?: string,
  ): Promise<CreateParcelResult> {
    const idempotencyKey = data.idempotencyKey ?? `parcel-${crypto.randomUUID()}`;
    const res = await ApiService.post<{
      parcel: any;
      authorizationUrl?: string;
      confirmationCode?: string;
    }>(
      "/parcels",
      {
        pickup: data.pickup,
        dropoff: data.dropoff,
        size: data.size,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        description: data.description,
        paymentMethod: data.paymentMethod,
        idempotencyKey,
      },
      token,
      { timeoutMs: 30_000 },
    );

    const delivery = mapParcelToDelivery(res.parcel);
    return {
      delivery,
      deliveryFee: delivery.deliveryFee,
      authorizationUrl: res.authorizationUrl,
      reference: res.parcel?.paymentReference,
      confirmationCode: res.confirmationCode,
    };
  }

  static async getDelivery(id: string, token?: string): Promise<Delivery> {
    const parcel = await ApiService.get<any>(`/parcels/${id}`, token);
    return mapParcelToDelivery(parcel);
  }

  static async getConfirmationCode(
    id: string,
    token?: string,
  ): Promise<{ parcelId: string; trackingId: string; confirmationCode: string }> {
    return ApiService.get(`/parcels/${id}/confirmation-code`, token);
  }

  static async rateDelivery(
    _deliveryId: string,
    _rating: number,
    _comment?: string,
    _token?: string,
  ): Promise<never> {
    void _deliveryId;
    void _rating;
    void _comment;
    void _token;
    // Backend does not have a delivery rating endpoint yet.
    throw new Error(
      "Delivery rating is not yet available. This feature is coming soon.",
    );
  }

  /** Poll parcel status after payment, waiting for it to move off PENDING. */
  static async pollDeliveryStatus(
    deliveryId: string,
    _targetStatus: string = "REQUESTED",
    maxAttempts: number = 20,
    interval: number = 3000,
    token?: string,
  ): Promise<boolean> {
    void _targetStatus;
    let attempts = 0;
    const paidStatuses = [
      "REQUESTED",
      "ASSIGNED",
      "ACCEPTED",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
    ];
    while (attempts < maxAttempts) {
      try {
        const delivery = await this.getDelivery(deliveryId, token);
        if (paidStatuses.includes(delivery.status)) return true;
        if (delivery.status === "CANCELLED") return false;
      } catch (e) {
        console.error("Polling error", e);
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * Verify a payment by reference. Real endpoint is GET /payments/verify/:reference
   * (path param, authenticated, no separate gateway param — Paystack is the
   * only gateway this backend supports).
   */
  static async verifyPayment(
    reference: string,
    _gateway: string = "PAYSTACK",
    token?: string,
  ): Promise<boolean | null> {
    void _gateway;
    try {
      const res: any = await ApiService.get(
        `/payments/verify/${encodeURIComponent(reference)}`,
        token,
      );
      return res.status === "COMPLETED";
    } catch (error: any) {
      if (error?.type === "network-error" || error?.type === "timeout") {
        return null; // Indeterminate — should retry
      }
      return false;
    }
  }

  static async getPaymentStatus(
    reference: string,
    _gateway: string = "PAYSTACK",
    token?: string,
  ): Promise<{ status: string; [key: string]: any }> {
    void _gateway;
    const res: any = await ApiService.get(
      `/payments/verify/${encodeURIComponent(reference)}`,
      token,
    );
    return { status: res.status || "UNKNOWN", ...res };
  }

  /** POST /parcels/:id/cancel */
  static async cancelDelivery(
    deliveryId: string,
    reason: string = "User cancelled before payment",
    token?: string,
  ) {
    return ApiService.post(`/parcels/${deliveryId}/cancel`, { reason }, token);
  }
}
