"use client";

import React from "react";
import { MapPin, ChevronRight, Loader2, Plus } from "lucide-react";
import { Address } from "@/app/main/checkout/types";
interface AddressSectionProps {
  addresses: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  onSelect: (addr: Address) => void;
  onAddNew: () => void;
  isProcessing: boolean;
}

export const AddressSection = ({
  addresses,
  selectedAddress,
  isLoading,
  onSelect,
  onAddNew,
  isProcessing,
}: AddressSectionProps) => {
  return (
    <section className="bg-white dark:bg-[#151515] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-yellow-500" /> Delivery Address
        </h2>
        {addresses.length > 0 && (
          <button
            onClick={onAddNew}
            className="text-yellow-600 dark:text-yellow-500 text-sm font-bold hover:underline"
            disabled={isProcessing}
          >
            Add New
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div
              onClick={onAddNew}
              className="p-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-yellow-500 hover:text-yellow-500 transition-colors"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="font-bold">Add your first address</span>
            </div>
          ) : (
            <div className="grid gap-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => !isProcessing && onSelect(addr)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedAddress?.id === addr.id
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                      : "border-gray-100 dark:border-white/5 hover:border-yellow-500/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{addr.label || "Home"}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-md">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {addr.street}, {addr.city}
                    </p>
                  </div>
                  {selectedAddress?.id === addr.id && (
                    <div className="w-4 h-4 rounded-full bg-yellow-500 shadow-sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
