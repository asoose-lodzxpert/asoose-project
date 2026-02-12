import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string; // Used by backend for order splitting
  image?: string | null;
}

interface CartState {
  items: CartItem[];
  
  // ACTIONS
  addItem: (item: CartItem) => void;
  decreaseItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;

  // SELECTORS
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getItemsByStore: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Multi-store implementation:
       * Removed the SweetAlert/Validation logic that blocked items from different vendors.
       */
      addItem: (newItem) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === newItem.id);

        if (existingItem) {
          set({
            items: currentItems.map((i) =>
              i.id === newItem.id
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
          });
        } else {
          set({
            items: [...currentItems, newItem],
          });
        }
      },

      decreaseItem: (itemId) => {
        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === itemId);

        if (existingItem && existingItem.quantity > 1) {
          set({
            items: currentItems.map((i) =>
              i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          });
        } else {
          get().removeItem(itemId);
        }
      },

      removeItem: (itemId) => {
        set({
          items: get().items.filter((i) => i.id !== itemId),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () =>
        get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        ),

      getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

      /**
       * Useful helper for UI grouping in the Cart/Checkout pages
       */
      getItemsByStore: () => {
        return get().items.reduce((acc, item) => {
          if (!acc[item.restaurantId]) {
            acc[item.restaurantId] = [];
          }
          acc[item.restaurantId].push(item);
          return acc;
        }, {} as Record<string, CartItem[]>);
      },
    }),
    {
      name: "asoosee-cart-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);