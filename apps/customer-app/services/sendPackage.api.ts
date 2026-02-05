import { request } from "@/lib/authFetch";
import { Address } from "@/types/delivery";

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Call backend to get a delivery fare based on coordinates.
export async function fetchDeliveryQuote(
  pickuplat: number,
  pickuplong: number,
  dropofflat: number,
  dropofflong: number,
) {
  // Build DTO expected by backend
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

  // Some request wrappers return { parsed } while others return the parsed body directly.
  const data = res && (res as any).parsed ? (res as any).parsed : res;

  // backend returns price, distance (meters + text), and eta (seconds + text)
  const price = Number(data?.price ?? 0);
  const distanceMeters = Number(data?.distance?.meters ?? 0);
  const durationSeconds = Number(data?.eta?.seconds ?? 0);

  const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
  const etaMinutes = Math.max(0, Math.round(durationSeconds / 60));

  return {
    distanceKm,
    etaMinutes,
    price, // Use only the backend price
  };
}

export async function fetchSavedAddresses(): Promise<Address[]> {
  const parsed = await request("users/addresses", { method: "GET" });

  return parsed.map((a: any) => ({
    id: a.id,
    label: a.label || a.street,
    fullAddress: `${a.street}, ${a.city}${a.state ? ", " + a.state : ""}`,
    coords: { latitude: a.lat, longitude: a.lng },
  }));
}

// Create delivery request in backend
export async function createDelivery(deliveryData: any) {
  const body = {
    pickupLocation: {
      latitude: Number(deliveryData.pickup.address.coords.latitude),
      longitude: Number(deliveryData.pickup.address.coords.longitude),
      address: deliveryData.pickup.address.fullAddress,
    },
    dropoffLocation: {
      latitude: Number(deliveryData.dropoff.address.coords.latitude),
      longitude: Number(deliveryData.dropoff.address.coords.longitude),
      address: deliveryData.dropoff.address.fullAddress,
    },
    recipientName: deliveryData.deliveryDetails.name,
    recipientPhone: deliveryData.deliveryDetails.phone,
    recipientInstructions: deliveryData.deliveryDetails.instructions,
    senderName: deliveryData.pickupDetails.name,
    senderPhone: deliveryData.pickupDetails.phone,
    senderInstructions: deliveryData.pickupDetails.instructions,
    packageSize: deliveryData.packageSize,
    weightKg: deliveryData.packageOptions.weightKg
      ? Number(deliveryData.packageOptions.weightKg)
      : undefined,
    declaredValue: deliveryData.packageOptions.declaredValue,
    fragile: deliveryData.packageOptions.fragile,
    perishable: deliveryData.packageOptions.perishable,
    containsLiquid: deliveryData.packageOptions.containsLiquid,
    packageDetails: `${deliveryData.packageSize} package${deliveryData.packageOptions.fragile ? ", Fragile" : ""}${deliveryData.packageOptions.perishable ? ", Perishable" : ""}${deliveryData.packageOptions.containsLiquid ? ", Contains Liquid" : ""}`,
  };

  const parsed = await request("trips/deliveries/request", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return parsed;
}
