import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { CartItem, Restaurant } from "@/types/cart";

type CartContextType = {
  items: CartItem[];
  restaurants: Restaurant[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  total: number;
};

import {
  fetchCart,
  addCartItem,
  removeCartItem,
  updateCartItemQty,
} from "@/services/cart.service";

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    fetchCart().then((data) => {
      setItems(data.items);
      setRestaurants(data.restaurants);
    });
  }, []);

  async function addItem(item: CartItem) {
    await addCartItem(item);
    const data = await fetchCart();
    setItems(data.items);
    setRestaurants(data.restaurants);
  }

  async function removeItem(id: string) {
    await removeCartItem(id);
    const data = await fetchCart();
    setItems(data.items);
    setRestaurants(data.restaurants);
  }

  async function increaseQty(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) {
      await updateCartItemQty(id, item.qty + 1);
      const data = await fetchCart();
      setItems(data.items);
      setRestaurants(data.restaurants);
    }
  }

  async function decreaseQty(id: string) {
    const item = items.find((i) => i.id === id);
    if (item && item.qty > 1) {
      await updateCartItemQty(id, item.qty - 1);
      const data = await fetchCart();
      setItems(data.items);
      setRestaurants(data.restaurants);
    }
  }

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        restaurants,
        addItem,
        removeItem,
        increaseQty,
        decreaseQty,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
