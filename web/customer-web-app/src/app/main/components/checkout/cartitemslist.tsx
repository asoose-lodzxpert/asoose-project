"use client";

import React from "react";
import { Plus, Minus, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { CartItem } from "@/app/main/checkout/types";
interface CartItemsListProps {
  items: CartItem[];
  isProcessing: boolean;
  onAdd: (item: CartItem) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const CartItemsList = ({
  items,
  isProcessing,
  onAdd,
  onDecrease,
  onRemove,
  onClear,
}: CartItemsListProps) => {
  return (
    <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Order Summary</h2>
        <div className="flex items-center gap-3">
          <button type="button" disabled={isProcessing} onClick={onClear} className="text-xs font-bold text-red-500 transition hover:text-red-600 disabled:opacity-50">Clear cart</button>
          <Link
            href="/main/store"
            className="text-sm font-bold text-yellow-600 dark:text-yellow-500"
          >
            Add Items
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div
            key={item.lineId ?? item.id}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {/* Controls */}
              <div className="flex flex-col items-center bg-gray-50 dark:bg-white/5 rounded-lg">
                <button
                  onClick={() =>
                    !isProcessing && onAdd({ ...item, quantity: 1 })
                  }
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-t-lg text-green-600"
                  disabled={isProcessing}
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold py-0.5 px-2">
                  {item.quantity}
                </span>
                <button
                  onClick={() =>
                    !isProcessing && onDecrease(item.lineId ?? item.id)
                  }
                  className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-b-lg text-red-500"
                  disabled={isProcessing}
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>

              {/* Image & Name */}
              <div className="relative w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg">
                    📦
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-bold line-clamp-2">{item.name}</p>
                {item.modifierNames && item.modifierNames.length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                    {item.modifierNames.join(" · ")}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  ₦{item.price.toLocaleString()} / unit
                </p>
              </div>
            </div>

            {/* Price & Remove */}
            <div className="flex items-center gap-4">
              <p className="text-sm font-black">
                ₦{(item.price * item.quantity).toLocaleString()}
              </p>
              <button
                onClick={() =>
                  !isProcessing && onRemove(item.lineId ?? item.id)
                }
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
