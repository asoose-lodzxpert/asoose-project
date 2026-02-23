"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Minus, Plus, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  onClose: () => void;
}

export const ProductModal = ({
  product,
  storeId,
  onClose,
}: ProductModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedModifiers({});
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
      // 2. Backend Enforcement (Critical)
      const token =
        (session as any)?.accessToken || (session as any)?.user?.accessToken;

      // Flatten all selected modifier IDs across all groups
      const modifierIds = Object.values(selectedModifiers).flat();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/cart/add`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: product.id,
            quantity: quantity,
            // Send modifier selections — backend validates, prices, and persists them
            modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
          }),
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/sign-in");
          throw new Error("Session expired");
        }
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }

      // 3. Success: Update Local Store
      // The price stored here is for display only — the backend is the authoritative source.
      addItem({
        id: product.id,
        name: product.name,
        price: totalPrice / quantity, // Display price: base + client-calculated modifier add-ons
        quantity,
        restaurantId: storeId,
        image: product.image,
        modifierIds: modifierIds.length > 0 ? modifierIds : undefined,
      });

      onClose();
      toast.success("Added to basket");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-[#1a1a1a] w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Header Image */}
          <div className="relative h-56 bg-gray-100 dark:bg-white/5 group">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition"
            >
              <X className="w-5 h-5" />
            </button>
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🍽️
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-black leading-tight mb-2 text-gray-900 dark:text-white">
                {product.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Modifiers List */}
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
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                            : "border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type={group.maxSelect === 1 ? "radio" : "checkbox"}
                            name={group.id}
                            checked={isSelected}
                            onChange={() =>
                              toggleModifier(group.id, opt.id, group.maxSelect)
                            }
                            className="w-4 h-4 accent-yellow-500"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {opt.name}
                          </span>
                        </div>
                        {opt.price > 0 && (
                          <span className="text-sm font-bold">
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

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1a1a]">
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
    </div>
  );
};