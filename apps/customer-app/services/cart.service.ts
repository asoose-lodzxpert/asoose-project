import { CartItem, Restaurant } from "@/types/cart";
import useAuthFetch from "@/lib/authFetch";

export type CartApiResponse = {
  items: CartItem[];
  restaurants: Restaurant[];
};

// These functions are not hooks, so we need to get the fetch helpers outside of React hooks
const { get, post } = useAuthFetch();

// GET /cart
export async function fetchCart(): Promise<CartApiResponse> {
  return await get("cart");
}

// POST /cart/add
export async function addCartItem(item: CartItem): Promise<CartApiResponse> {
  return await post("cart/add", item);
}

// POST /cart/remove
export async function removeCartItem(id: string): Promise<CartApiResponse> {
  return await post("cart/remove", { id });
}

// POST /cart/update-qty
export async function updateCartItemQty(
  id: string,
  qty: number
): Promise<CartApiResponse> {
  return await post("cart/update-qty", { id, qty });
}
