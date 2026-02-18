import { request } from "@/lib/authFetch";
import { Address, DeliveryQuote } from "@/types/delivery";

/**
 * Formats a numeric amount to Nigerian Naira (NGN) currency string.
 */
export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Fetches a delivery fare quote from the backend.
 * Matches: RideEstimateDto (but backend expects pickuplat, pickuplong, dropofflat, dropofflong as strings)
 */
export async function fetchDeliveryQuote(
  pickuplat: number,
  pickuplong: number,
  dropofflat: number,
  dropofflong: number,
): Promise<DeliveryQuote> {
  const body = {
    pickuplat: String(pickuplat),
    pickuplong: String(pickuplong),
    dropofflat: String(dropofflat),
    dropofflong: String(dropofflong),
  };

  const res = await request("fare/delivery", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // Handle various wrapper formats
  const data = res && (res as any).parsed ? (res as any).parsed : res;

  const price = Number(data?.price ?? 0);
  const distanceMeters = Number(data?.distance?.meters ?? 0);
  const durationSeconds = Number(data?.eta?.seconds ?? 0);

  return {
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    etaMinutes: Math.max(0, Math.round(durationSeconds / 60)),
    price,
  };
}

/**
 * Retrieves the current user's saved addresses and maps them to the local Address type.
 */
export async function fetchSavedAddresses(): Promise<Address[]> {
  const res = await request("users/addresses", { method: "GET" });
  const data = res && (res as any).parsed ? (res as any).parsed : res;

  if (!Array.isArray(data)) return [];

  return data.map((a: any) => ({
    id: a.id,
    label: a.label || a.street,
    fullAddress: `${a.street}, ${a.city}${a.state ? ", " + a.state : ""}`,
    coords: { latitude: a.lat, longitude: a.lng },
    placeId: a.placeId,
  }));
}

/**
 * Creates a new delivery request.
 * Matches: RequestDeliveryDto
 */
export async function createDelivery(deliveryData: any) {
  const pickup = deliveryData.pickup?.address || {};
  const dropoff = deliveryData.dropoff?.address || {};

  const parseNum = (val: any) => {
    const n = Number(val);
    return isNaN(n) || val === "" || val === null ? undefined : n;
  };

  const body = {
    // Nested LocationPayloadDto
    pickupLocation: {
      addressText: pickup.fullAddress || pickup.label || "",
      lat: parseNum(pickup.coords?.latitude),
      lng: parseNum(pickup.coords?.longitude),
      placeId: pickup.placeId || undefined,
    },
    // Nested LocationPayloadDto
    dropoffLocation: {
      addressText: dropoff.fullAddress || dropoff.label || "",
      lat: parseNum(dropoff.coords?.latitude),
      lng: parseNum(dropoff.coords?.longitude),
      placeId: dropoff.placeId || undefined,
    },

    // Recipient & Sender info
    recipientName: deliveryData.deliveryDetails?.name || "",
    recipientPhone: deliveryData.deliveryDetails?.phone || "",
    recipientInstructions:
      deliveryData.deliveryDetails?.instructions || undefined,
    senderName: deliveryData.pickupDetails?.name || undefined,
    senderPhone: deliveryData.pickupDetails?.phone || undefined,
    senderInstructions: deliveryData.pickupDetails?.instructions || undefined,

    // Package details
    packageSize: deliveryData.packageSize || undefined,
    packageDetails:
      deliveryData.packageDetails ||
      `${deliveryData.packageSize || ""} package${deliveryData.packageOptions?.fragile ? ", Fragile" : ""}`,

    // Numeric & Boolean values (validated for NestJS)
    weightKg: parseNum(deliveryData.packageOptions?.weightKg),
    declaredValue: parseNum(deliveryData.packageOptions?.declaredValue),
    fragile: deliveryData.packageOptions?.fragile,
    perishable: deliveryData.packageOptions?.perishable,
    containsLiquid: deliveryData.packageOptions?.containsLiquid,

    // Optional IDs
    orderId: deliveryData.orderId || undefined,
    pickupAddressId: deliveryData.pickupAddressId || undefined,
    dropoffAddressId: deliveryData.dropoffAddressId || undefined,
  };

  if (__DEV__)
    console.log(
      "Creating delivery with payload:",
      JSON.stringify(body, null, 2),
    );

  return await request("trips/deliveries/request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
