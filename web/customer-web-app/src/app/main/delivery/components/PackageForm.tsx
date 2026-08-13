'use client';

import React from 'react';
import { ChevronRight, Box, Truck, PackageOpen } from 'lucide-react';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { PACKAGE_TYPES } from '@/constants/packageTypes';

interface PackageFormProps {
  onContinue: () => void;
}

export default function PackageForm({ onContinue }: PackageFormProps) {
  const { packageInfo, setPackageInfo } = useDeliveryStore();

  const getIcon = (id: string) => {
    switch (id) {
      case 'SMALL': return Box;
      case 'MEDIUM': return PackageOpen;
      case 'LARGE': return Truck;
      default: return Box;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Existing Package Type Selection */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Delivery size
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {PACKAGE_TYPES.map((type) => {
            const Icon = getIcon(type.id);
            const isSelected = packageInfo.size === type.id;
            return (
              <button
                key={type.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPackageInfo({
                  type: `${type.label} delivery`,
                  size: type.id,
                  weight: type.weightLabel,
                  weightKg: type.weightValue,
                })}
                className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2 text-center transition-all sm:min-h-32 sm:p-3 ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                    : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-yellow-500/50'
                }`}
              >
                <Icon size={24} className={isSelected ? 'text-yellow-600' : 'text-gray-400'} />
                <div className="text-center">
                  <span className={`block text-xs font-bold mb-1 ${isSelected ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500'}`}>
                    {type.label}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {type.weightLabel}
                  </span>
                  <span className="mt-1 hidden text-[10px] leading-4 text-gray-400 sm:block">
                    {type.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Instructions */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Delivery description
        </label>
        <textarea
          value={packageInfo.instructions}
          onChange={(e) => setPackageInfo({ instructions: e.target.value })}
          maxLength={255}
          placeholder="e.g. Fragile — laptop"
          className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 text-sm focus:ring-2 focus:ring-yellow-500 outline-none h-24 resize-none dark:text-white placeholder:text-gray-400 transition-colors"
        />
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-2xl shadow-lg shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        Get delivery estimate <ChevronRight size={18} />
      </button>
    </div>
  );
}
