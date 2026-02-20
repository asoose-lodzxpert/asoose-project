import { request } from "@/lib/authFetch";
import { Address } from "@/types/address";

export const fetchAddresses = async (): Promise<Address[]> => {
  const parsed = await request("users/addresses", { method: "GET" });
  if (!Array.isArray(parsed)) return [];
  return parsed as Address[];
};

export const saveAddress = async (address: Address): Promise<void> => {
  const body = {
    street: address.street,
    city: address.city,
    state: address.state,
    label: address.label,
    lat: address.lat,
    lng: address.lng,
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
