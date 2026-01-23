import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  MarketplaceHomeResponse,
  PaginatedStoresResponse,
  StoreFilterSlug,
} from "@/types/home";

const DEFAULT_BACKEND = "https://asoose.com/api/v1/";
const BACKEND_URL =
  (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "") + "/";
const ACCESS_TOKEN_KEY = "@auth/access_token";

type RequestOptions = RequestInit & { path: string };

async function request<T>({ path, ...init }: RequestOptions): Promise<T> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(BACKEND_URL + path.replace(/^\/+/, ""), {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data || response.statusText;
    throw new Error(typeof message === "string" ? message : "Request failed");
  }

  return data as T;
}

export async function fetchMarketplaceHome(): Promise<MarketplaceHomeResponse> {
  return request<MarketplaceHomeResponse>({ path: "marketplace/home" });
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
  return request<PaginatedStoresResponse>({
    path: `marketplace/stores${suffix ? `?${suffix}` : ""}`,
  });
}
