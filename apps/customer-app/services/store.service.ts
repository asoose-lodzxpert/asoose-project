import { request } from "@/lib/authFetch";
import type { StoreData } from "@/types/store-types";

export async function fetchStoreBySlug(
  slug: string,
  lat?: number,
  lng?: number,
): Promise<StoreData> {
  let url = `marketplace/vendor/${slug}`;
  if (lat && lng) {
    url += `?lat=${lat}&lng=${lng}`;
  }
  return request(url);
}
