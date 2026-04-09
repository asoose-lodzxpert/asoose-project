import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  lineId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  cityId?: string; // ✅ Track which city the item belongs to
  image?: string | null;
  modifierIds?: string[];
  modifierNames?: string[];
}

export function computeLineId(
  productId: string,
  modifierIds?: string[],
): string {
  if (!modifierIds || modifierIds.length === 0) return productId;
  return `${productId}_${modifierIds.slice().sort().join(",")}`;
}

/** Callers pass everything except `lineId` — the store computes it internally from id + modifierIds. */
export type AddItemPayload = Omit<CartItem, "lineId">;

interface CartState {
  items: CartItem[];
  addItem: (item: AddItemPayload) => void;
  decreaseItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getItemsByStore: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (newItem: AddItemPayload) => {
        const lineId = computeLineId(newItem.id, newItem.modifierIds);
        const itemWithLineId: CartItem = { ...newItem, lineId };
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.lineId === lineId);

        if (existingItem) {
          set({
            items: currentItems.map((i) =>
              i.lineId === lineId
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i,
            ),
          });
        } else {
          set({ items: [...currentItems, itemWithLineId] });
        }
      },

      decreaseItem: (lineId) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(
          (i) => (i.lineId ?? i.id) === lineId,
        );

        if (existingItem && existingItem.quantity > 1) {
          set({
            items: currentItems.map((i) =>
              (i.lineId ?? i.id) === lineId
                ? { ...i, quantity: i.quantity - 1 }
                : i,
            ),
          });
        } else {
          get().removeItem(lineId);
        }
      },

      removeItem: (lineId) => {
        set({
          items: get().items.filter((i) => (i.lineId ?? i.id) !== lineId),
        });
      }, // ← was followed by a rogue `});` and `},` here

      clearCart: () => set({ items: [] }),

      getTotalPrice: () =>
        get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0,
        ),

      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

      getItemsByStore: () => {
        return get().items.reduce(
          (acc, item) => {
            if (!acc[item.restaurantId]) {
              acc[item.restaurantId] = [];
            }
            acc[item.restaurantId].push(item);
            return acc;
          },
          {} as Record<string, CartItem[]>,
        );
      },
    }),
    {
      name: "asoosee-cart-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
