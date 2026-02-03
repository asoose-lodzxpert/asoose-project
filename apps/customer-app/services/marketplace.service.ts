import { request } from "@/lib/authFetch";
import {
  MarketplaceHomeResponse,
  PaginatedStoresResponse,
  StoreFilterSlug,
} from "@/types/home";

export async function fetchMarketplaceHome(): Promise<MarketplaceHomeResponse> {
  return request("marketplace/home");
}

export type StoresQuery = {
  page?: number;
  limit?: number;
  type?: Exclude<StoreFilterSlug, "all"> | string;
};

export async function fetchPaginatedStores(
  query: StoresQuery = {},
): Promise<PaginatedStoresResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const type = query.type?.toString().trim();
  if (type && type !== "all") params.set("type", type);

  const suffix = params.toString();
  return request(`marketplace/stores${suffix ? `?${suffix}` : ""}`);
}
