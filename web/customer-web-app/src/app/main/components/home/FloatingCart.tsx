"use client";

import React, { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from "next/navigation";

import { CheckoutConfirmationModal } from "../cart/CheckoutConfirmationModal";

export const FloatingCart = () => {
  const [mounted, setMounted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  // Directly selecting state to ensure reactivity
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    // Rehydrate to prevent hydration mismatch
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // Industry best practice: Hide if empty or on desktop
  if (!mounted || totalItems === 0) return null;

  return (
    <>
      <div className="fixed top-28 right-6 z-[999] md:hidden">
        <button
          onClick={() => setShowConfirmModal(true)}
          aria-label="View Cart"
          className="relative w-12 h-12 bg-yellow-500 text-black rounded-full shadow-2xl shadow-yellow-500/40 flex items-center justify-center active:scale-90 transition-transform border-4 border-white dark:border-[#0a0a0a]"
        >
          {/* Main Cart Icon */}
          <ShoppingBag className="w-7 h-7" strokeWidth={2.5} />

          {/* Floating Badge for Item Count */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-black shadow-lg border-2 border-white dark:border-[#0a0a0a]">
            {totalItems}
          </div>
        </button>
      </div>

      <CheckoutConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          router.push("/main/checkout");
        }}
      />
    </>
  );
};
