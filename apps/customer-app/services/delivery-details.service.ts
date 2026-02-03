import { get } from "@/lib/authFetch";

export async function fetchDeliveryDetails(id: string) {
  return get(`/users/deliveries/${id}`);
}
