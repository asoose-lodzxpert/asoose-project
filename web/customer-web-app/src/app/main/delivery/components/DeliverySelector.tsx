"use client";

import React, { useState, useMemo } from "react";
import {
  Truck,
  Bike,
  Car,
  Info,
  Scale,
  ShoppingBag,
  FileText,
} from "lucide-react";

interface DeliverySelectorProps {
  onConfirm: (selectedPrice: number) => void; // Updated to pass back the price
  basePrice: number | null;
}

export default function DeliverySelector({
  onConfirm,
  basePrice,
}: DeliverySelectorProps) {
  const [selectedId, setSelectedId] = useState("Bike");

  // Dynamic Pricing Logic:
  // Base price (from backend) is assumed to be for the standard/cheapest option (Bike).
  // We apply multipliers for larger vehicles.
  const VEHICLE_MULTIPLIERS: Record<string, number> = {
    Bike: 1.0,
    Car: 1.6, // 60% markup
    Van: 3.5, // 250% markup
  };

  const vehicles = [
    {
      id: "Bike",
      icon: Bike,
      label: "Express Bike",
      time: "15-30 mins",
      capacity: "Max 5kg",
      bestFor: "Documents & Small Parcels",
      limitIcon: FileText,
    },
    {
      id: "Car",
      icon: Car,
      label: "Standard Car",
      time: "25-45 mins",
      capacity: "Max 100kg",
      bestFor: "Groceries, Fragile Items",
      limitIcon: ShoppingBag,
    },
    {
      id: "Van",
      icon: Truck,
      label: "Large Van",
      time: "1-3 hours",
      capacity: "Max 800kg",
      bestFor: "Furniture, Moving, Bulk",
      limitIcon: Scale,
    },
  ];

  // Helper to get price for a specific vehicle
  const getVehiclePrice = (id: string) => {
    if (!basePrice) return 0;
    const multiplier = VEHICLE_MULTIPLIERS[id] || 1;
    // Round to nearest 50 for cleaner pricing
    return Math.ceil((basePrice * multiplier) / 50) * 50;
  };

  const currentSelectedPrice = useMemo(() => {
    return getVehiclePrice(selectedId);
  }, [basePrice, selectedId]);

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-black mb-6 dark:text-white">
        Choose a courier
      </h2>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {vehicles.map((v) => {
          const price = getVehiclePrice(v.id);
          const isSelected = selectedId === v.id;

          return (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all group ${
                isSelected
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10"
                  : "border-gray-50 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl transition-colors ${isSelected ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 group-hover:bg-gray-200"}`}
                  >
                    <v.icon size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {v.label}
                    </p>
                    <p className="text-xs text-gray-500">{v.time}</p>
                  </div>
                </div>
                <p className="font-black text-lg dark:text-white">
                  ₦{price.toLocaleString()}
                </p>
              </div>

              {/* Capacity & Usage Info */}
              <div
                className={`mt-2 pt-2 border-t flex gap-4 text-xs ${isSelected ? "border-yellow-200 dark:border-yellow-800/30" : "border-gray-100 dark:border-zinc-800"}`}
              >
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <Scale size={12} />
                  <span>{v.capacity}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <v.limitIcon size={12} />
                  <span className="truncate max-w-[150px]">{v.bestFor}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-6 space-y-4 border-t border-gray-100 dark:border-zinc-800 mt-4">
        <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 dark:bg-zinc-900 p-3 rounded-lg">
          <Info size={14} className="shrink-0 mt-0.5" />
          <p>
            Final price varies by vehicle type. All trips include
            goods-in-transit insurance.
          </p>
        </div>
        <button
          onClick={() => onConfirm(currentSelectedPrice)}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-2xl shadow-xl transition-all active:scale-95 hover:shadow-2xl flex justify-between px-8"
        >
          <span>
            Request {vehicles.find((v) => v.id === selectedId)?.label}
          </span>
          <span>₦{currentSelectedPrice.toLocaleString()}</span>
        </button>
      </div>
    </div>
  );
}
