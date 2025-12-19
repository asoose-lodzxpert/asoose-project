import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 1. Define what an Item looks like in the cart
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,

      addItem: (newItem) => {
        const currentItems = get().items;
        const currentRestaurant = get().restaurantId;

        if (currentRestaurant && currentRestaurant !== newItem.restaurantId) {
            const confirmSwitch = window.confirm("Start a new basket? You have items from another restaurant.");
            if (!confirmSwitch) return;
            
            set({ items: [newItem], restaurantId: newItem.restaurantId });
            return;
        }

        const existingItem = currentItems.find(i => i.id === newItem.id);

        if (existingItem) {
          set({
            items: currentItems.map(i => 
              i.id === newItem.id 
                ? { ...i, quantity: i.quantity + newItem.quantity }
                : i
            ),
            restaurantId: newItem.restaurantId
          });
        } else {
          set({
            items: [...currentItems, newItem],
            restaurantId: newItem.restaurantId
          });
        }
      },

      removeItem: (itemId) => {
        const newItems = get().items.filter(i => i.id !== itemId);
        set({ 
            items: newItems,
            restaurantId: newItems.length === 0 ? null : get().restaurantId 
        });
      },

      clearCart: () => set({ items: [], restaurantId: null }),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      }
    }),
    {
      name: 'asoosee-cart-storage',
      storage: createJSONStorage(() => localStorage), 
      skipHydration: true, 
    }
  )
);