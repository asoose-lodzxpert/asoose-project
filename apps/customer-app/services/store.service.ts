import { request } from "@/lib/authFetch";
import type { StoreData } from "@/types/store-types";

export async function fetchStoreBySlug(slug: string): Promise<StoreData> {
  return request(`marketplace/vendor/${slug}`);
}
