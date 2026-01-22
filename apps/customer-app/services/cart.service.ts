import AsyncStorage from "@react-native-async-storage/async-storage";
import { CartSummaryResponse } from "@/types/cart";

const DEFAULT_BACKEND = "https://asoose.com/api/v1/";
const BACKEND_URL =
  (process.env.BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, "") + "/";
const ACCESS_TOKEN_KEY = "@auth/access_token";

type RequestOptions = {
  path: string;
  body: unknown;
};

async function authorizedPost<T>({ path, body }: RequestOptions): Promise<T> {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(BACKEND_URL + path.replace(/^\/+/, ""), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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

export type CartSummaryPayload = {
  items: {
    productId: string;
    quantity: number;
  }[];
};

export async function fetchCartSummary(
  payload: CartSummaryPayload,
): Promise<CartSummaryResponse> {
  return authorizedPost<CartSummaryResponse>({
    path: "cart/summary",
    body: payload,
  });
}
