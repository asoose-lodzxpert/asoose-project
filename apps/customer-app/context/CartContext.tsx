import { fetchCartSummary } from "@/services/cart.service";
import { CartItem, Restaurant } from "@/types/cart";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CartContextType = {
  items: CartItem[];
  restaurants: Restaurant[];
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  increaseQty: (id: string) => Promise<void>;
  decreaseQty: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  loading: boolean;
  error: string | null;
  canCheckout: boolean;
};

const CartContext = createContext<CartContextType | null>(null);

function getCartStorageKey(userId?: string | null) {
  return userId
    ? `@asoose/cart-items:${userId}`
    : "@asoose/cart-items:anonymous";
}

type CartProviderProps = { children: React.ReactNode; userId?: string | null };
export const CartProvider: React.FC<CartProviderProps> = ({
  children,
  userId,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [total, setTotal] = useState(0);
  const [hydrating, setHydrating] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncRequestRef = useRef(0);

  const loading = hydrating || syncing;

  const persistItems = useCallback(
    async (nextItems: CartItem[]) => {
      try {
        await AsyncStorage.setItem(
          getCartStorageKey(userId),
          JSON.stringify(nextItems),
        );
      } catch {
        // best-effort persistence; ignore errors silently for now
      }
    },
    [userId],
  );

  const syncSummary = useCallback(
    async (nextItems: CartItem[]) => {
      const requestId = ++syncRequestRef.current;

      if (!nextItems.length) {
        if (requestId !== syncRequestRef.current) return;
        setRestaurants([]);
        setSubtotal(0);
        setDeliveryFee(0);
        setTotal(0);
        setError(null);
        setSyncing(false);
        return;
      }

      setSyncing(true);
      try {
        const response = await fetchCartSummary({
          items: nextItems.map((item) => ({
            productId: item.id,
            quantity: item.qty,
          })),
        });

        if (requestId !== syncRequestRef.current) return;

        const restaurant = response.restaurant
          ? {
              id: response.restaurant.id,
              name: response.restaurant.name,
              deliveryTime: response.restaurant.time,
              image: response.restaurant.image,
              currency: response.restaurant.currency,
            }
          : null;

        setRestaurants(restaurant ? [restaurant] : []);
        setSubtotal(response.subtotal);
        setDeliveryFee(response.deliveryFee);
        setTotal(response.total);

        const mergedItems = response.items.map((serverItem) => {
          const local = nextItems.find((item) => item.id === serverItem.id);
          const vendorId = local?.vendorId ?? restaurant?.id ?? "";
          return {
            id: serverItem.id,
            name: serverItem.name || local?.name || "",
            image: serverItem.image ?? local?.image,
            price: serverItem.price,
            qty: serverItem.quantity,
            options: local?.options,
            vendorId,
            description: serverItem.description ?? local?.description,
            available: serverItem.available,
          } as CartItem;
        });

        setItems(mergedItems);
        await persistItems(mergedItems);
        setError(null);
      } catch (err: any) {
        const message =
          typeof err === "string"
            ? err
            : err?.message || "Unable to update cart";
        setError(message);
      } finally {
        if (requestId === syncRequestRef.current) {
          setSyncing(false);
        }
      }
    },
    [persistItems],
  );

  // Hydrate cart on mount or when userId changes
  useEffect(() => {
    const hydrate = async () => {
      setHydrating(true);
      try {
        const stored = await AsyncStorage.getItem(getCartStorageKey(userId));
        if (stored) {
          const parsed: CartItem[] = JSON.parse(stored);
          if (parsed.length) {
            setItems(parsed);
            await syncSummary(parsed);
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } catch (err) {
        if (__DEV__) console.warn("Unable to hydrate cart", err);
        setItems([]);
      } finally {
        setHydrating(false);
      }
    };
    hydrate();
    // Clear cart if user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function addItem(item: CartItem) {
    const existingVendorId = items[0]?.vendorId;
    if (existingVendorId && existingVendorId !== item.vendorId) {
      throw new Error(
        "You can only checkout items from one vendor at a time. Clear your cart to continue.",
      );
    }

    const existing = items.find((i) => i.id === item.id);
    const nextItems = existing
      ? items.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + item.qty } : i,
        )
      : [...items, item];

    setItems(nextItems);
    await persistItems(nextItems);
    await syncSummary(nextItems);
  }

  async function removeItem(id: string) {
    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    await persistItems(nextItems);
    await syncSummary(nextItems);
  }

  async function increaseQty(id: string) {
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, qty: item.qty + 1 } : item,
    );
    setItems(nextItems);
    await persistItems(nextItems);
    await syncSummary(nextItems);
  }

  async function decreaseQty(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const nextItems =
      target.qty <= 1
        ? items.filter((i) => i.id !== id)
        : items.map((item) =>
            item.id === id ? { ...item, qty: item.qty - 1 } : item,
          );

    setItems(nextItems);
    await persistItems(nextItems);
    await syncSummary(nextItems);
  }

  async function clearCart() {
    syncRequestRef.current += 1;
    setItems([]);
    setRestaurants([]);
    setSubtotal(0);
    setDeliveryFee(0);
    setTotal(0);
    setError(null);
    setSyncing(false);
    await persistItems([]);
  }

  const canCheckout = useMemo(() => {
    if (!items.length) return false;
    const vendorIds = new Set(items.map((i) => i.vendorId));
    return vendorIds.size <= 1;
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        restaurants,
        addItem,
        removeItem,
        increaseQty,
        decreaseQty,
        clearCart,
        subtotal,
        deliveryFee,
        total,
        loading,
        error,
        canCheckout,
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
