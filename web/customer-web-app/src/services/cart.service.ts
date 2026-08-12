import { ApiService } from "./api.service";
import {
  computeLineId,
  type CartItem as LocalCartItem,
} from "@/store/useCartStore";

export interface ServerCartItem {
  id: string;
  menuItemId: string | null;
  productId: string | null;
  quantity: number;
  instructions: string | null;
  unitPrice: number;
  lineTotal: number;
  menuItem: {
    id: string;
    name: string;
    price: number;
    category: string | null;
    image: string | null;
    isAvailable: boolean;
  } | null;
  product: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
    isAvailable?: boolean;
  } | null;
}

export interface CartSummary {
  cartKind: "RESTAURANT" | "STORE" | "EMPTY" | string;
  itemCount: number;
  subtotal?: number;
  deliveryFee?: number;
  minimumOrder?: number;
  meetsMinimumOrder?: boolean;
  amountToMinimum?: number;
  restaurantId?: string | null;
  restaurantName?: string | null;
  storeId?: string | null;
  storeName?: string | null;
}

export interface ServerCart {
  id?: string;
  items: ServerCartItem[];
  summary: CartSummary;
  createdAt?: string;
  updatedAt?: string;
}

export function mapServerCartItems(cart: ServerCart): LocalCartItem[] {
  const ownerId = cart.summary.restaurantId || cart.summary.storeId || "";

  return (cart.items || []).flatMap((item) => {
    const source = item.menuItem || item.product;
    const sourceId = item.menuItemId || item.productId || source?.id;
    if (!source || !sourceId) return [];

    return [
      {
        id: sourceId,
        lineId: computeLineId(sourceId),
        serverItemId: item.id,
        name: source.name,
        price: Number(item.unitPrice ?? source.price ?? 0),
        quantity: Number(item.quantity || 0),
        restaurantId: ownerId,
        image: source.image || null,
        kind: item.menuItemId ? "DISH" : "PRODUCT",
        instructions: item.instructions || undefined,
      } satisfies LocalCartItem,
    ];
  });
}

export class CartService {
  static get(token?: string) {
    return ApiService.get<ServerCart>("/cart", token);
  }

  static add(
    payload: {
      menuItemId?: string;
      productId?: string;
      quantity: number;
      instructions?: string;
    },
    token?: string,
  ) {
    return ApiService.post<unknown>("/cart/items", payload, token);
  }

  static removeItem(cartItemId: string, token?: string) {
    return ApiService.delete<{ summary: CartSummary }>(
      `/cart/items/${cartItemId}`,
      token,
    );
  }

  static clear(token?: string) {
    return ApiService.delete<Pick<ServerCart, "items" | "summary">>(
      "/cart",
      token,
    );
  }
}
