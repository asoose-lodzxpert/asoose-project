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
import { request } from "@/lib/authFetch";
import { Address } from "@/types/delivery";

export async function fetchSavedAddresses(): Promise<Address[]> {
  const { parsed } = await request("users/addresses", { method: "GET" });

  return parsed.map((a: any) => ({
    id: a.id,
    label: a.label || a.street,
    fullAddress: `${a.street}, ${a.city}${a.state ? ", " + a.state : ""}`,
    coords: { latitude: a.lat, longitude: a.lng },
  }));
}
