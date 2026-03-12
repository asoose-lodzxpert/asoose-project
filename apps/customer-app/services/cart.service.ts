import { request } from "@/lib/authFetch";
import { CartSummaryResponse } from "@/types/cart";

export type CartSummaryPayload = {
  items: {
    productId: string;
    quantity: number;
    modifierIds?: string[];
  }[];
};

export async function fetchCartSummary(
  payload: CartSummaryPayload,
): Promise<CartSummaryResponse> {
  return request("cart/summary", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
