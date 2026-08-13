"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { CartService, mapServerCartItems } from "@/services/cart.service";
import { useCartStore } from "@/store/useCartStore";

export function CartHydrator() {
  const { data: session, status } = useSession();
  const accessToken = session?.accessToken;

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;

    let cancelled = false;
    const hydrateCart = async () => {
      await useCartStore.persist.rehydrate();
      try {
        const cart = await CartService.get(accessToken);
        if (!cancelled) {
          useCartStore.getState().replaceItems(mapServerCartItems(cart));
        }
      } catch {
        // Keep the persisted cart available when the server cannot be reached.
      }
    };

    hydrateCart();
    return () => {
      cancelled = true;
    };
  }, [accessToken, status]);

  return null;
}
