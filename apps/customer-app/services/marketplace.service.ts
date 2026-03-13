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

export interface ProductDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  images: string[];
  available: boolean;
  status: string;
  stock: number | null;
  inventory: number | null;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
  } | null;
  store: {
    id: string;
    name: string;
    slug: string;
    type: string;
  };
  modifierGroups: Array<{
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    modifiers: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
}

export interface SummaryProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: string[];
  category: { name: string } | null;
  store?: { id: string; name: string; slug: string };
}

export async function fetchProductById(id: string): Promise<ProductDetails> {
  return request(`marketplace/products/${id}`);
}

export async function fetchProductStoreItems(
  id: string,
): Promise<SummaryProduct[]> {
  return request(`marketplace/products/${id}/store-items`);
}

export async function fetchProductRelated(
  id: string,
): Promise<SummaryProduct[]> {
  return request(`marketplace/products/${id}/related`);
}
