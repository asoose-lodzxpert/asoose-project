'use client';

import React from 'react';
import { ChevronRight, Box, FileText, Truck, Layers } from 'lucide-react';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { PACKAGE_TYPES } from '@/constants/packageTypes'; // Ensure path matches your structure

interface PackageFormProps {
  onContinue: () => void;
}

export default function PackageForm({ onContinue }: PackageFormProps) {
  const { packageInfo, setPackageInfo } = useDeliveryStore();

  // Helper to map type IDs to visual icons
  const getIcon = (id: string) => {
    switch (id) {
      case 'Document': return FileText;
      case 'Parcel': return Box;
      case 'Bulk': return Layers;
      case 'Heavy': return Truck;
      default: return Box;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Package Type Selection */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Package Type
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PACKAGE_TYPES.map((type) => {
            const Icon = getIcon(type.id);
            const isSelected = packageInfo.type === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setPackageInfo({ 
                  type: type.id, 
                  // FIX: Auto-sync weight with type selection to prevent mismatch
                  weight: type.weightLabel 
                })}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all h-32 ${
                  isSelected
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                    : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-yellow-500/50'
                }`}
              >
                <Icon 
                  size={24} 
                  className={isSelected ? 'text-yellow-600' : 'text-gray-400'} 
                />
                <div className="text-center">
                  <span className={`block text-xs font-bold mb-1 ${
                    isSelected ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500'
                  }`}>
                    {type.label}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {type.weightLabel}
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
          Special Instructions
        </label>
        <textarea
          value={packageInfo.instructions}
          onChange={(e) => setPackageInfo({ instructions: e.target.value })}
          placeholder="e.g. Fragile items, ring bell on arrival..."
          className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 text-sm focus:ring-2 focus:ring-yellow-500 outline-none h-24 resize-none dark:text-white placeholder:text-gray-400 transition-colors"
        />
      </div>

      {/* Action Button */}
      <button
        onClick={onContinue}
        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl shadow-lg shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        Calculate Price <ChevronRight size={18} />
      </button>
    </div>
  );
}