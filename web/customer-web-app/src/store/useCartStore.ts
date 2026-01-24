import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Swal from 'sweetalert2'; // ✅ Import SweetAlert2

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  image?: string | null;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  
  // ✅ FIX: Return Promise<boolean> to let callers know if add succeeded
  addItem: (item: CartItem) => Promise<boolean>; 
  decreaseItem: (itemId: string) => void;
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

      addItem: async (newItem) => { // ✅ FIX: Made async
        const currentItems = get().items;
        const currentRestaurant = get().restaurantId;

        // Validation: Prevent mixing orders from different vendors
        if (currentRestaurant && currentRestaurant !== newItem.restaurantId) {
            // ✅ FIX: Replaced window.confirm with SweetAlert2
            const result = await Swal.fire({
                title: 'Start a new basket?',
                text: "You have items from another vendor. Adding this item will clear your current cart.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#eab308', // Yellow-500 (Matches app theme)
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, start new',
                cancelButtonText: 'Cancel',
                backdrop: `rgba(0,0,0,0.4)`
            });

            if (!result.isConfirmed) return false; // User cancelled
            
            set({ items: [newItem], restaurantId: newItem.restaurantId });
            return true; // Success
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
        return true; // Success
      },

      decreaseItem: (itemId) => {
        const currentItems = get().items;
        const existingItem = currentItems.find(i => i.id === itemId);

        if (existingItem && existingItem.quantity > 1) {
            set({
                items: currentItems.map(i => 
                    i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                )
            });
        } else {
            get().removeItem(itemId);
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

      getTotalPrice: () => get().items.reduce((total, item) => total + (item.price * item.quantity), 0),
      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0)
    }),
    {
      name: 'asoosee-cart-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);