import { request } from "@/lib/authFetch";
import { Address } from "@/types/address";

export const fetchAddresses = async (): Promise<Address[]> => {
  const parsed = await request("users/addresses", { method: "GET" });
  if (!Array.isArray(parsed)) return [];

  return parsed.map((a: any) => ({
    id: a.id,
    label: a.label || a.street,
    address: `${a.street}, ${a.city}${a.state ? ", " + a.state : ""}`,
    coordinates: { lat: String(a.lat), lng: String(a.lng) },
    isDefault: !!a.isDefault,
  }));
};

export const saveAddress = async (address: Address): Promise<void> => {
  const body = {
    street: address.address.split(",")[0] || address.address,
    city: address.address.split(",")[1]?.trim() || "",
    state: address.address.split(",")[2]?.trim() || "",
    label: address.label,
    lat: Number(address.coordinates.lat),
    lng: Number(address.coordinates.lng),
    isDefault: address.isDefault,
  };
  await request("users/addresses", {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const deleteAddress = async (id: string): Promise<void> => {
  await request(`users/addresses/${id}`, { method: "DELETE" });
};
