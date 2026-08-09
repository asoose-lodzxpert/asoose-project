"use client";

import { Plus, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-toastify";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ModifierGroupRef {
  id: string;
  minSelect: number;
  maxSelect: number;
}

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  storeId: string;
  storeName?: string;
  cityId?: string;
  isAvailable?: boolean;
  stock?: number;
  status?: string;
  manageStock?: boolean;
  /** Modifier groups passed through so the card can gate direct-add for required-modifier products. */
  modifierGroups?: ModifierGroupRef[];
  /** RESTAURANT storefronts add dishes (menuItemId); STORE storefronts add products (productId). */
  kind?: "PRODUCT" | "DISH";
  onClick?: () => void;
}

export const ProductCard = ({
  id,
  name,
  description,
  price,
  image,
  storeId,
  storeName,
  cityId,
  isAvailable = true,
  stock = 0,
  status = "ACTIVE",
  manageStock = false,
  modifierGroups,
  kind = "PRODUCT",
  onClick,
}: ProductProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isSoldOut = manageStock && (stock <= 0 || status === "OUT_OF_STOCK");

  /** True when ONE OR MORE modifier groups require a selection (minSelect > 0). */
  const hasRequiredModifiers = (modifierGroups ?? []).some(
    (g) => g.minSelect > 0,
  );

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAvailable) {
      toast.error("This item is not available in your current location", {
        position: "bottom-center",
      });
      return;
    }

    if (isSoldOut) {
      toast.error("This item is currently sold out", {
        position: "bottom-center",
      });
      return;
    }

    // Only route through the details modal when there's actually something
    // to collect — otherwise every quick-add click opened the full product
    // modal on top of the page instead of just adding the item.
    if (hasRequiredModifiers) {
      if (onClick) {
        onClick();
        return;
      }
      // No modal opener available and modifiers are required — we can't
      // collect the required modifierIds, and the backend will reject the
      // request (minSelect enforcement).
      toast.info("Please tap the item to choose your options", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    if (sessionStatus !== "authenticated") {
      toast.info("Please log in to add items to your cart", {
        position: "bottom-center",
        autoClose: 3000,
      });
      router.push("/sign-in");
      return;
    }

    setLoading(true);

    try {
      const token =
        (session as any)?.accessToken || (session as any)?.user?.accessToken;

      // Best-effort server sync — the local cart (re-synced in full at
      // checkout) is the source of truth for the shopping session.
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          kind === "DISH"
            ? { menuItemId: id, quantity: 1 }
            : { productId: id, quantity: 1 },
        ),
      }).catch(() => {});

      addItem({
        id,
        name,
        price,
        quantity: 1,
        image,
        restaurantId: storeId,
        cityId,
        kind,
      });

      toast.success("Added to basket");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={isSoldOut ? undefined : onClick}
      className={`bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 transition-colors group relative ${isSoldOut ? 'opacity-60 cursor-not-allowed' : 'hover:border-yellow-500/30 cursor-pointer'}`}
    >
      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 96px, 128px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            📦
          </div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-widest px-2 py-1 bg-red-600 rounded">
              Sold Out
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
        <div>
          {storeName && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              {storeName}
            </span>
          )}
          <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1 text-sm sm:text-base">
            {name}
          </h4>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>

        <div className="flex justify-between items-end mt-2">
          <span className="font-black text-lg">₦{price.toLocaleString()}</span>
          <button
            onClick={handleQuickAdd}
            disabled={loading || isSoldOut || !isAvailable}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:bg-yellow-500 hover:text-black transition-colors z-10 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};