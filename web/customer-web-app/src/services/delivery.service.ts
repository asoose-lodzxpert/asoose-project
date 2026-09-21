import { ApiService } from "./api.service";

// Compatibility view used by existing customer delivery and tracking screens.
export interface Delivery {
  id: string;
  trackingId?: string;
  status:
    | "SCHEDULED"
    | "SEARCHING_RIDER"
    | "RIDER_ASSIGNED"
    | "RIDER_ACCEPTED"
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
  paymentMethod?: ParcelPaymentMethod;
  party?: ParcelParty;
  senderName?: string;
  senderPhone?: string;
  scheduledAt?: string | null;
  authorizationUrl?: string;
  idempotencyKey?: string;
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

/** Preserve parcel workflow states; accept legacy delivery aliases for older consumers. */
export function mapParcelStatus(status: string): Delivery["status"] {
  switch (status) {
    case "SEARCHING_RIDER":
      return "SEARCHING_RIDER";
    case "RIDER_ASSIGNED":
      return "RIDER_ASSIGNED";
    case "RIDER_ACCEPTED":
      return "RIDER_ACCEPTED";
    case "CANCELLED_BY_USER":
    case "CANCELLED_BY_RIDER":
    case "CANCELLED_BY_SYSTEM":
      return "CANCELLED";
    case "CANCELLED":
    case "SCHEDULED":
    case "REQUESTED":
    case "ASSIGNED":
    case "ACCEPTED":
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
    party: p.party,
    scheduledAt: p.scheduledAt,
    senderName: p.senderName || p.customer?.name,
    senderPhone: p.senderPhone || p.customer?.phone,
    authorizationUrl: p.authorizationUrl,
    idempotencyKey: p.idempotencyKey,
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
      ? {
          ...p.pickupAddress,
          address: p.pickupAddress.address ?? p.pickupAddress.street,
        }
      : undefined,
    dropoffAddress: p.dropoffAddress
      ? {
          ...p.dropoffAddress,
          address: p.dropoffAddress.address ?? p.dropoffAddress.street,
        }
      : undefined,
    createdAt: p.createdAt,
    pickedUpAt: p.pickedUpAt,
    deliveredAt: p.deliveredAt,
  };
}

export type ParcelParty = "SENDER" | "RECIPIENT" | "THIRD_PARTY";
export type ParcelPaymentMethod = "CASH" | "WALLET" | "CARD";
export type ParcelSize = "SMALL" | "MEDIUM" | "LARGE";
export type ParcelStatus =
  | "PENDING"
  | "SCHEDULED"
  | "SEARCHING_RIDER"
  | "RIDER_ASSIGNED"
  | "RIDER_ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
/** Parcel states stay explicit while older screens may still accept Delivery aliases. */
export interface Parcel extends Omit<Delivery, "status"> {
  status: ParcelStatus;
}

export interface CreateParcelInput {
  pickup: ParcelLocation;
  dropoff: ParcelLocation;
  size: ParcelSize;
  party?: ParcelParty;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  description?: string;
  scheduledAt?: string;
  paymentMethod: ParcelPaymentMethod;
  idempotencyKey?: string;
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
    data: CreateParcelInput,
    token?: string,
  ): Promise<CreateParcelResult> {
    const idempotencyKey =
      data.idempotencyKey ?? `parcel-${crypto.randomUUID()}`;
    const res = await ApiService.post<{
      parcel: any;
      authorizationUrl?: string;
      confirmationCode?: string;
    }>(
      "/parcels",
      {
        ...data,
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

  static async listParcels(
    page = 1,
    token?: string,
    status?: string,
  ): Promise<{
    parcels: Delivery[];
    pagination: { totalPages: number; total: number };
  }> {
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) query.set("status", status);
    const result = await ApiService.get<{
      parcels: any[];
      pagination: { totalPages: number; total: number };
    }>(`/parcels?${query}`, token);
    return { ...result, parcels: result.parcels.map(mapParcelToDelivery) };
  }

  /** The backend accepts one status per request; merge active states before paginating. */
  static async listActiveParcels(
    page = 1,
    token?: string,
  ): Promise<{
    parcels: Delivery[];
    pagination: { totalPages: number; total: number };
  }> {
    const statuses = [
      "PENDING",
      "SEARCHING_RIDER",
      "RIDER_ASSIGNED",
      "RIDER_ACCEPTED",
      "PICKED_UP",
      "IN_TRANSIT",
    ];
    return this.listParcelStatuses(statuses, page, token);
  }

  static async listCancelledParcels(page = 1, token?: string) {
    return this.listParcelStatuses(["CANCELLED_BY_USER", "CANCELLED_BY_RIDER", "CANCELLED_BY_SYSTEM"], page, token);
  }

  private static async listParcelStatuses(statuses: string[], page: number, token?: string) {
    const groups = await Promise.all(
      statuses.map(async (status) => {
        const first = await this.listParcels(1, token, status);
        const parcels = [...first.parcels];
        for (let next = 2; next <= first.pagination.totalPages; next++) {
          parcels.push(
            ...(await this.listParcels(next, token, status)).parcels,
          );
        }
        return parcels;
      }),
    );
    const parcels = [
      ...new Map(groups.flat().map((parcel) => [parcel.id, parcel])).values(),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      parcels: parcels.slice((page - 1) * 20, page * 20),
      pagination: {
        totalPages: Math.max(1, Math.ceil(parcels.length / 20)),
        total: parcels.length,
      },
    };
  }

  static async retryPayment(
    id: string,
    token?: string,
  ): Promise<{ authorizationUrl: string; reference?: string }> {
    return ApiService.post(
      `/parcels/${encodeURIComponent(id)}/retry-payment`,
      undefined,
      token,
    );
  }

  static async getDelivery(id: string, token?: string): Promise<Delivery> {
    const parcel = await ApiService.get<any>(`/parcels/${id}`, token);
    return mapParcelToDelivery(parcel);
  }

  static async getConfirmationCode(
    id: string,
    token?: string,
  ): Promise<{
    parcelId: string;
    trackingId: string;
    confirmationCode: string;
  }> {
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
      "SCHEDULED",
      "SEARCHING_RIDER",
      "RIDER_ASSIGNED",
      "RIDER_ACCEPTED",
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
        if (
          paidStatuses.includes(delivery.status) &&
          (delivery.paymentMethod !== "CARD" ||
            delivery.paymentStatus === "COMPLETED")
        )
          return true;
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
