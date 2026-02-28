"use client";

import React, { useEffect } from "react";
import { MapPin, Plus, X, Check } from "lucide-react";
import { Address } from "@/app/main/checkout/types";

interface AddressPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedAddress: Address | null;
  onSelect: (addr: Address) => void;
  onAddNew: () => void;
}

export function AddressPickerModal({
  isOpen,
  onClose,
  addresses,
  selectedAddress,
  onSelect,
  onAddNew,
}: AddressPickerModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (addr: Address) => {
    onSelect(addr);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div
        className="
          fixed z-50 bg-white dark:bg-[#151515] shadow-2xl
          /* Mobile: full-width bottom sheet */
          inset-x-0 bottom-0 rounded-t-3xl max-h-[85vh]
          /* Desktop: centered modal */
          sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
          sm:w-full sm:max-w-md sm:rounded-3xl sm:max-h-[80vh]
          flex flex-col
        "
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-yellow-500" />
            Select Address
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Address list */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {addresses.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-4 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-500/10 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-yellow-500 opacity-70" />
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">
                  No saved addresses
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add a delivery address to place your order.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onAddNew();
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-colors shadow-sm shadow-yellow-500/20"
              >
                <Plus className="w-4 h-4" />
                Add Delivery Address
              </button>
            </div>
          ) : (
            addresses.map((addr) => {
              const isSelected = selectedAddress?.id === addr.id;
              return (
                <button
                  key={addr.id}
                  onClick={() => handleSelect(addr)}
                  className={`w-full text-left p-4 rounded-2xl border flex items-center gap-3 transition-all ${
                    isSelected
                      ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                      : "border-gray-100 dark:border-white/10 hover:border-yellow-500/50"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full flex-shrink-0 ${
                      isSelected
                        ? "bg-yellow-500 text-black"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {addr.label || "Home"}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-md">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {addr.city ? `${addr.street}, ${addr.city}` : addr.street}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Add new address button */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5">
          <button
            onClick={() => {
              onClose();
              onAddNew();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-yellow-500 hover:text-yellow-500 dark:hover:text-yellow-500 transition-colors font-bold text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Address
          </button>
        </div>
      </div>
    </>
  );
}
