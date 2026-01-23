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
