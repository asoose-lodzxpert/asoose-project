import { request } from "@/lib/authFetch";
import { Address } from "@/types/delivery";

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function calculatePrice(packageSize: string): number {
  switch (packageSize) {
    case "small":
      return 500;
    case "medium":
      return 1000;
    case "large":
      return 2500;
    case "extra_large":
      return 5000;
    default:
      return 0;
  }
}

// Call backend to get a delivery fare based on coordinates.
export async function fetchDeliveryQuote(
  pickuplat: number,
  pickuplong: number,
  dropofflat: number,
  dropofflong: number,
  packageSize: string,
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

  // backend returns price and distance/eta details. Normalize fields safely.
  const priceFromServer = Number(data?.price ?? data?.totalFare ?? 0);
  const distanceMeters = Number(
    data?.distance?.meters ?? data?.distanceMeters ?? 0,
  );
  const durationSeconds = Number(
    data?.eta?.seconds ?? data?.durationSeconds ?? data?.duration ?? 0,
  );

  const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
  const etaMinutes = Math.max(0, Math.round(durationSeconds / 60));

  const packagePrice = calculatePrice(packageSize);

  return {
    distanceKm,
    etaMinutes,
    // total price = server-calculated delivery fare + package base price
    price: Math.round(priceFromServer + packagePrice),
  };
}

export async function fetchSavedAddresses(): Promise<Address[]> {
  const { parsed } = await request("users/addresses", { method: "GET" });

  return parsed.map((a: any) => ({
    id: a.id,
    label: a.label || a.street,
    fullAddress: `${a.street}, ${a.city}${a.state ? ", " + a.state : ""}`,
    coords: { latitude: a.lat, longitude: a.lng },
  }));
}
