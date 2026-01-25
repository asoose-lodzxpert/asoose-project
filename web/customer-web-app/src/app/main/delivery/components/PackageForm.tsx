'use client';

import React from 'react';
import { Package, Info, ChevronRight, Box, FileText, Truck } from 'lucide-react';
import { useDeliveryStore } from '@/store/useDeliveryStore';


interface PackageFormProps {
  onContinue: () => void;
}

export default function PackageForm({ onContinue }: PackageFormProps) {
  const { packageInfo, setPackageInfo } = useDeliveryStore();

  const packageTypes = [
    { id: 'Document', icon: FileText, label: 'Documents' },
    { id: 'Small Box', icon: Box, label: 'Small Box' },
    { id: 'Large Item', icon: Truck, label: 'Large Item' },
  ];

  const weights = ['< 5kg', '5-20kg', '20-50kg', '50kg+'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Package Type Selection */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Package Type
        </label>
        <div className="grid grid-cols-3 gap-3">
          {packageTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setPackageInfo({ type: type.id })}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                packageInfo.type === type.id
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                  : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900'
              }`}
            >
              <type.icon size={20} className={packageInfo.type === type.id ? 'text-yellow-600' : 'text-gray-400'} />
              <span className={`text-[10px] font-bold ${packageInfo.type === type.id ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500'}`}>
                {type.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Weight Selection */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Estimated Weight
        </label>
        <div className="flex flex-wrap gap-2">
          {weights.map((w) => (
            <button
              key={w}
              onClick={() => setPackageInfo({ weight: w })}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                packageInfo.weight === w
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent'
                  : 'bg-white dark:bg-zinc-900 text-gray-500 border-gray-100 dark:border-zinc-800'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 mb-3 block tracking-widest">
          Special Instructions
        </label>
        <textarea
          value={packageInfo.instructions}
          onChange={(e) => setPackageInfo({ instructions: e.target.value })}
          placeholder="e.g. Fragile items, ring bell on arrival..."
          className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 text-sm focus:ring-2 focus:ring-yellow-500 outline-none h-24 resize-none dark:text-white"
        />
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl shadow-lg shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-2 transition-all"
      >
        Calculate Price <ChevronRight size={18} />
      </button>
    </div>
  );
}