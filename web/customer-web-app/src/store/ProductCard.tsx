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
  /** Modifier groups passed through so the card can gate direct-add for required-modifier products. */
  modifierGroups?: ModifierGroupRef[];
  onClick?: () => void;
  /**
   * When provided, clicking the card body navigates to this URL.
   * The + button still calls onClick (for modal) or direct-adds.
   */
  href?: string;
}

export const ProductCard = ({
  id,
  name,
  description,
  price,
  image,
  storeId,
  storeName,
  modifierGroups,
  onClick,
  href,
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

    // If the parent provided an onClick handler (e.g., to open a ProductModal),
    // delegate to it so modifier groups with required selections can be satisfied.
    // This prevents bypassing backend modifier validation.
    if (onClick) {
      onClick();
      return;
    }

    // Block direct-add for products that require modifier selections.
    // Without a modal, we cannot collect the required modifierIds and the
    // backend will reject the request (minSelect enforcement).
    if (hasRequiredModifiers) {
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

      await ApiService.post(
        "/cart/add",
        { productId: id, quantity: 1 },
        token,
        {},
      );

      // 3. Success: Update Local Store (Optimistic or Sync)
      addItem({
        id,
        name,
        price,
        quantity: 1,
        image: image,
        restaurantId: storeId,
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
      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image?.startsWith("http") ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📦
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          {storeName && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              {storeName}
            </span>
          )}
          <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">
            {name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>

        <div className="flex justify-between items-end mt-2">
          <span className="font-black text-lg">₦{price.toLocaleString()}</span>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={loading}
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
