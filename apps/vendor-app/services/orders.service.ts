import { fetchWithAuth } from "./auth-fetch";

/* ---------- Types ---------- */

export interface OrderItemModifier {
  id?: string;
  name: string;
  price: number;
}

export interface OrderItemModifierGroup {
  id?: string;
  name: string;
  modifiers: OrderItemModifier[];
}

export interface OrderItem {
  id: string;
  productId: string;
  nameSnap: string;
  quantity: number;

  /** Base product price (without modifiers) */
  price: number;

  /** Selected modifiers (snapshotted) */
  modifierGroups?: OrderItemModifierGroup[];

  /** Optional precomputed item total from backend */
  total?: number;
}

export interface Order {
  id: string;
  user: {
    name: string;
    image: string;
    phone: string;
  };
  items: OrderItem[];
  total: number;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED"
    | "REJECTED";
  specialInstructions?: string;
  createdAt: string;
  deliveryAddress?: string;
}

export interface OrdersResponse {
  data: Order[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/* ---------- Helpers ---------- */

function computeItemTotal(item: OrderItem): number {
  const base = Number(item.price) || 0;

  const modifiersTotal =
    item.modifierGroups?.reduce((groupSum, group) => {
      return (
        groupSum +
        group.modifiers.reduce(
          (modSum, mod) => modSum + (Number(mod.price) || 0),
          0,
        )
      );
    }, 0) ?? 0;

  return (base + modifiersTotal) * (Number(item.quantity) || 0);
}

/* ---------- API ---------- */

export async function fetchOrders(
  status: "pending" | "active" | "history",
  page: number = 1,
): Promise<OrdersResponse> {
  const statusMap = {
    pending: "PENDING",
    active: "CONFIRMED,PREPARING,READY",
    history: "DELIVERED,CANCELLED,REJECTED",
  };

  const resp = await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders?status=${statusMap[status]}&page=${page}&limit=20`,
  );

  try {
    if (resp && Array.isArray(resp.data)) {
      resp.data = resp.data.map((order: any) => {
        const items: OrderItem[] = Array.isArray(order.items)
          ? order.items.map((it: any) => {
              const price = Number(it.price);
              const quantity = Number(it.quantity);

              const normalizedItem: OrderItem = {
                ...it,
                price: Number.isFinite(price) ? price : 0,
                quantity: Number.isFinite(quantity) ? quantity : 0,
                modifierGroups: Array.isArray(it.modifierGroups)
                  ? it.modifierGroups
                  : [],
              };

              return {
                ...normalizedItem,
                total:
                  typeof it.total === "number"
                    ? it.total
                    : computeItemTotal(normalizedItem),
              };
            })
          : [];

        const computedTotal = items.reduce(
          (sum, item) => sum + (item.total || 0),
          0,
        );

        return {
          ...order,
          items,
          total: computedTotal,
        };
      });
    }
  } catch (e) {
    // Fallback to backend response if normalization fails
  }

  return resp;
}

/* ---------- Actions ---------- */

export async function acceptOrder(orderId: string) {
  return fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/accept`,
    { method: "PATCH" },
  );
}

export async function declineOrder(orderId: string, reason: string) {
  return fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/decline`,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    },
  );
}

export async function markAsPreparing(orderId: string) {
  return fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/preparing`,
    { method: "PATCH" },
  );
}

export async function markAsReady(orderId: string) {
  return fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/orders/${orderId}/ready`,
    { method: "PATCH" },
  );
}
