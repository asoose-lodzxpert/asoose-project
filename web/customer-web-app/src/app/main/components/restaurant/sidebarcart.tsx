"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useRideStore } from "@/app/main/ride/store/ride";
import { useRouter } from "next/navigation";
import { CheckoutConfirmationModal } from "../cart/CheckoutConfirmationModal";

interface SidebarCartProps {
  restaurantName: string;
}

export const SidebarCart = ({ restaurantName }: SidebarCartProps) => {
  const [mounted, setMounted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const totalPrice = useCartStore((state) => state.getTotalPrice());
  const currentCityId = useRideStore((state) => state.cityId);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-lg">Your Order</h3>
        <span className="text-xs font-bold text-gray-400 line-clamp-1 max-w-[100px]">
          {restaurantName}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm border-dashed border-2 border-gray-100 dark:border-white/5 rounded-xl mb-4">
          Your cart is empty
        </div>
      ) : (
        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {items.map((item) => {
            const isUnavailable =
              currentCityId && item.cityId && currentCityId !== item.cityId;

            return (
              <div
                key={item.lineId}
                className={`space-y-1 ${isUnavailable ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded-md text-xs">
                      {item.quantity}x
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.name}
                      {item.modifierNames && item.modifierNames.length > 0 && (
                        <span className="block text-xs text-gray-400 dark:text-gray-500 font-normal leading-tight">
                          {item.modifierNames.join(" · ")}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-bold">
                    ₦{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
                {isUnavailable && (
                  <div className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-md">
                    Not available in your location
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Total Section */}
      {items.length > 0 && (
        <div className="flex justify-between items-center mb-4 border-t border-dashed border-gray-200 dark:border-white/10 pt-4">
          <span className="text-gray-500 font-medium">Total</span>
          <span className="font-black text-xl">
            ₦{totalPrice.toLocaleString()}
          </span>
        </div>
      )}

      <button
        onClick={() => setShowConfirmModal(true)}
        disabled={items.some((item) => currentCityId && item.cityId && currentCityId !== item.cityId)}
        className="block text-center w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Checkout
      </button>

      <CheckoutConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          setShowConfirmModal(false);
          router.push("/main/checkout");
        }}
      />
    </div>
  );
};
