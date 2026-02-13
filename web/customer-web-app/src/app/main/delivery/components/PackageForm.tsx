'use client';

import React from 'react';
import { ChevronRight, Box, FileText, Truck, Layers, Info } from 'lucide-react';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { PACKAGE_TYPES } from '@/constants/packageTypes';

interface PackageFormProps {
  onContinue: () => void;
}

export default function PackageForm({ onContinue }: PackageFormProps) {
  const { packageInfo, setPackageInfo } = useDeliveryStore();

  const getIcon = (id: string) => {
    switch (id) {
      case 'Document': return FileText;
      case 'Parcel': return Box;
      case 'Bulk': return Layers;
      case 'Heavy': return Truck;
      default: return Box;
    }
  };

  const handleNumberInput = (field: 'weightKg' | 'declaredValue', value: string) => {
    if (value === '') {
      setPackageInfo({ [field]: '' });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setPackageInfo({ [field]: num });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Existing Package Type Selection */}
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
                  weight: type.weightLabel 
                })}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all h-32 ${
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
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Package Details Section */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-yellow-500" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Package Details <span className="text-gray-400 font-normal text-xs">(Optional)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Declared Value */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block">
              Declared Value (₦)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              // ✅ FIX: Use null coalescing (?? '') to ensure value is never undefined
              value={packageInfo.declaredValue ?? ''}
              onChange={(e) => handleNumberInput('declaredValue', e.target.value)}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
            />
          </div>

          {/* Weight Input */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 block">
              Weight (kg)
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 2.5"
              // ✅ FIX: Use null coalescing (?? '') here as well
              value={packageInfo.weightKg ?? ''}
              onChange={(e) => handleNumberInput('weightKg', e.target.value)}
              className="w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Checkbox Attributes */}
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'isFragile', label: 'Fragile' },
            { id: 'isPerishable', label: 'Perishable' },
            { id: 'containsLiquid', label: 'Liquid' },
          ].map((attr) => (
            <label 
              key={attr.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium select-none ${
                packageInfo[attr.id as keyof typeof packageInfo]
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-500'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                className="hidden"
                checked={!!packageInfo[attr.id as keyof typeof packageInfo]}
                onChange={(e) => setPackageInfo({ [attr.id]: e.target.checked })}
              />
              {/* Custom Checkbox Indicator */}
              <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                 packageInfo[attr.id as keyof typeof packageInfo] ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300'
              }`}>
                {packageInfo[attr.id as keyof typeof packageInfo] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              {attr.label}
            </label>
          ))}
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
          placeholder="e.g. Leave at front desk..."
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