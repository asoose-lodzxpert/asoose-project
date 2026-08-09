"use client";

import { Plus, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-toastify";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiService } from "@/services/api.service";

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
  cityId?: string; // ✅ Added cityId
  /** Modifier groups passed through so the card can gate direct-add for required-modifier products. */
  modifierGroups?: ModifierGroupRef[];
  isAvailable?: boolean;
  onClick?: () => void;
  /**
   * When provided, clicking the card body navigates to this URL.
   * The + button still calls onClick (for modal) or direct-adds.
   */
  href?: string;
  isSoldOut?: boolean;
  /** RESTAURANT storefronts add dishes (menuItemId); STORE storefronts add products (productId). */
  kind?: "PRODUCT" | "DISH";
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
  modifierGroups,
  onClick,
  href,
  isAvailable = true,
  isSoldOut = false,
  kind = "PRODUCT",
}: ProductProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /** True when ONE OR MORE modifier groups require a selection (minSelect > 0). */
  const hasRequiredModifiers = (modifierGroups ?? []).some(
    (g) => g.minSelect > 0,
  );

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAvailable) {
      toast.error("This item is not available in your current location", {
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

    // 1. Frontend Security Gate (no modal path — direct add only for modifier-free products)
    if (status !== "authenticated") {
      toast.info("Please log in to add items to your cart", {
        position: "bottom-center",
        autoClose: 3000,
      });
      router.push("/sign-in"); // Redirect preserves intent better than just blocking
      return;
    }

    setLoading(true);

    try {
      // 2. Backend Enforcement (Critical) — ApiService handles 401 redirect automatically
      const token =
        (session as any)?.accessToken || (session as any)?.user?.accessToken;

      // Best-effort server sync — the local cart (re-synced in full at
      // checkout) is the source of truth for the shopping session.
      ApiService.post(
        "/cart/items",
        kind === "DISH"
          ? { menuItemId: id, quantity: 1 }
          : { productId: id, quantity: 1 },
        token,
        {},
      ).catch(() => {});

      // 3. Success: Update Local Store (Optimistic or Sync)
      addItem({
        id,
        name,
        price,
        quantity: 1,
        image: image,
        restaurantId: storeId,
        cityId, // ✅ Store cityId in cart
        kind,
      });

      toast.success("Added to basket");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cardBody = (
    <>
      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image?.startsWith("http") ? (
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
            type="button"
            onClick={handleQuickAdd}
            disabled={loading || !isAvailable || isSoldOut}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:bg-yellow-500 hover:text-black transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 hover:border-yellow-500/30 transition-colors group cursor-pointer"
      >
        {cardBody}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 hover:border-yellow-500/30 transition-colors group cursor-pointer"
    >
      {cardBody}
    </div>
  );
};
