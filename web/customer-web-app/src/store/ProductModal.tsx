"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Minus, Plus, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ApiService } from "@/services/api.service";

// --- Types must match what is passed from the page ---
export interface Modifier {
  id: string;
  name: string;
  price: number;
}
export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: { name: string };
  modifierGroups: ModifierGroup[];
}

interface ProductModalProps {
  product: Product | null;
  storeId: string;
  /** RESTAURANT storefronts add dishes (menuItemId); STORE storefronts add products (productId). */
  kind?: "PRODUCT" | "DISH";
  onClose: () => void;
}

export const ProductModal = ({
  product,
  storeId,
  kind = "PRODUCT",
  onClose,
}: ProductModalProps) => {
  const [mounted, setMounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers({});
      setImgError(false);
    }
  }, [product]);

  const toggleModifier = (
    groupId: string,
    modifierId: string,
    maxSelect: number,
  ) => {
    setSelectedModifiers((prev) => {
      const currentGroup = prev[groupId] || [];
      const isSelected = currentGroup.includes(modifierId);

      if (isSelected) {
        return {
          ...prev,
          [groupId]: currentGroup.filter((id) => id !== modifierId),
        };
      } else {
        if (maxSelect === 1) return { ...prev, [groupId]: [modifierId] };
        if (currentGroup.length >= maxSelect) return prev;
        return { ...prev, [groupId]: [...currentGroup, modifierId] };
      }
    });
  };

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    let total = product.price;

    // Add modifiers safely
    (product.modifierGroups || []).forEach((group) => {
      const selectedIds = selectedModifiers[group.id] || [];
      const groupModifiers = group.modifiers.filter((m) =>
        selectedIds.includes(m.id),
      );
      total += groupModifiers.reduce((sum, m) => sum + m.price, 0);
    });

    return total * quantity;
  }, [product, selectedModifiers, quantity]);

  const isValid = useMemo(() => {
    if (!product) return false;
    // Check required selections
    return (product.modifierGroups || []).every((group) => {
      const count = (selectedModifiers[group.id] || []).length;
      return count >= group.minSelect;
    });
  }, [product, selectedModifiers]);

  const handleAddToOrder = async () => {
    if (!product || !isValid) return;

    // 1. Frontend Security Gate
    if (status !== "authenticated") {
      toast.info("Please log in to add items to your cart", {
        position: "bottom-center",
        autoClose: 3000,
      });
      router.push("/sign-in");
      return;
    }

    setIsSubmitting(true);

    try {
      const token =
        (session as any)?.accessToken || (session as any)?.user?.accessToken;

      // Flatten all selected modifier IDs — kept for local display only.
      // The backend cart has no modifier concept, so this never reaches the API;
      // checkout re-syncs quantity/kind only, and pricing there is base-price.
      const modifierIds: string[] = Object.values(selectedModifiers).flat();

      // Best-effort server sync — the local cart (synced again in full at
      // checkout) is the source of truth for the shopping session, so a
      // failure here shouldn't block the user from adding the item.
      ApiService.post(
        "/cart/items",
        kind === "DISH"
          ? { menuItemId: product.id, quantity }
          : { productId: product.id, quantity },
        token,
        {},
      ).catch(() => {});

      const modifierNames: string[] = (product.modifierGroups || []).flatMap(
        (group) =>
          group.modifiers
            .filter((m) => modifierIds.includes(m.id))
            .map((m) => m.name),
      );

      addItem({
        id: product.id,
        name: product.name,
        price: totalPrice / quantity, // display price: base + client-calculated modifier add-ons
        quantity,
        restaurantId: storeId,
        image: product.image,
        kind,
        modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
        modifierNames: modifierNames.length > 0 ? modifierNames : undefined,
      });

      onClose();
      toast.success("Added to basket");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center sm:px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:max-h-[88vh] sm:rounded-3xl sm:zoom-in-95 dark:bg-[#1a1a1a]">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative h-44 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 sm:h-56 dark:from-slate-800 dark:to-slate-900">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {product.image?.startsWith("http") && !imgError ? (
              <Image
                src={product.image}
                alt={product.name}
                width={512}
                height={224}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
                quality={85}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <span className="text-5xl">🍽️</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {imgError ? "Image unavailable" : "No image"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <div>
              <h2 className="mb-2 text-xl font-black leading-tight text-gray-900 sm:text-2xl dark:text-white">
                {product.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            {(product.modifierGroups || []).map((group) => (
              <div key={group.id}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-900 dark:text-gray-200">
                    {group.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded font-bold ${
                      group.minSelect > 0
                        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500"
                    }`}
                  >
                    {group.minSelect > 0 ? "Required" : "Optional"}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.modifiers.map((opt) => {
                    const isSelected = (
                      selectedModifiers[group.id] || []
                    ).includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                            : "border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type={group.maxSelect === 1 ? "radio" : "checkbox"}
                            name={group.id}
                            checked={isSelected}
                            onChange={() =>
                              toggleModifier(group.id, opt.id, group.maxSelect)
                            }
                            className="w-4 h-4 accent-yellow-500"
                          />
                          <span className="min-w-0 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {opt.name}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className="shrink-0 text-sm font-bold">
                            +₦{opt.price.toLocaleString()}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4 dark:border-white/5 dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-4 mb-4 justify-center">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xl font-bold w-8 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToOrder}
            disabled={!isValid || isSubmitting}
            className={`w-full py-4 rounded-xl font-bold flex justify-between items-center px-6 transition-all ${
              isValid && !isSubmitting
                ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"
                : "bg-gray-200 dark:bg-white/10 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <div className="w-full flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <>
                <span>Add to Order</span>
                <span>₦{totalPrice.toLocaleString()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
