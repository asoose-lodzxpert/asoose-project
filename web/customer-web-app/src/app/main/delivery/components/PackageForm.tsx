'use client';

import React, { useState } from 'react';
import { ChevronRight, Box, FileText, Truck, Layers, Info } from 'lucide-react';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import { PACKAGE_TYPES } from '@/constants/packageTypes';
import { deliverySwal } from '@/lib/swal-theme';

// ─── Business Rules ────────────────────────────────────────────
const WEIGHT_MIN_KG    = 0.1;
const WEIGHT_MAX_KG    = 999;
const VALUE_MIN_NGN    = 1;
const VALUE_MAX_NGN    = 10_000_000;

interface PackageFormProps {
  onContinue: () => void;
}

export default function PackageForm({ onContinue }: PackageFormProps) {
  const { packageInfo, setPackageInfo } = useDeliveryStore();

  // Inline error state so users see feedback live after blurring or invalid submit
  const [weightError, setWeightError]         = useState<string | null>(null);
  const [declaredValueError, setDeclaredValueError] = useState<string | null>(null);

  const getIcon = (id: string) => {
    switch (id) {
      case 'Document': return FileText;
      case 'Parcel': return Box;
      case 'Bulk': return Layers;
      case 'Heavy': return Truck;
      default: return Box;
    }
  };

  // ─── Live input handler ─────────────────────────────────────────────────
  const handleNumberInput = (field: 'weightKg' | 'declaredValue', value: string) => {
    if (value === '') {
      setPackageInfo({ [field]: null });
      if (field === 'weightKg')     setWeightError(null);
      if (field === 'declaredValue') setDeclaredValueError(null);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      if (field === 'weightKg')     setWeightError('Must be a number');
      if (field === 'declaredValue') setDeclaredValueError('Must be a number');
      return;
    }
    setPackageInfo({ [field]: num });
    // Clear inline error while user is still typing valid characters
    if (field === 'weightKg')     setWeightError(null);
    if (field === 'declaredValue') setDeclaredValueError(null);
  };

  // ─── Blur-time inline validation ────────────────────────────────────────
  const handleWeightBlur = () => {
    const w = packageInfo.weightKg;
    if (w === undefined || w === null) return; // optional field
    const num = Number(w);
    if (isNaN(num) || num <= 0) {
      setWeightError(`Must be greater than 0 kg`);
    } else if (num > WEIGHT_MAX_KG) {
      setWeightError(`Maximum supported weight is ${WEIGHT_MAX_KG} kg`);
    } else {
      setWeightError(null);
    }
  };

  const handleDeclaredValueBlur = () => {
    const v = packageInfo.declaredValue;
    if (v === undefined || v === null) return; // optional field
    const num = Number(v);
    if (isNaN(num) || num <= 0) {
      setDeclaredValueError(`Must be greater than ₦0`);
    } else if (num > VALUE_MAX_NGN) {
      setDeclaredValueError(`Maximum declared value is ₦${VALUE_MAX_NGN.toLocaleString()}`);
    } else {
      setDeclaredValueError(null);
    }
  };

  // ─── Pre-submit validation with SweetAlert2 ─────────────────────────────
  const handleValidateAndContinue = async () => {
    const swal = deliverySwal();

    // ── Weight ──────────────────────────────────────────────────────────────
    const rawWeight = packageInfo.weightKg;
    if (rawWeight !== undefined && rawWeight !== null) {
      const w = Number(rawWeight);
      if (isNaN(w) || w <= 0) {
        setWeightError(`Must be greater than ${WEIGHT_MIN_KG} kg`);
        await swal.fire({
          icon: 'error',
          title: 'Invalid Package Weight',
          html: `
            <p>Weight must be a <strong>positive number greater than 0</strong>.</p>
            <p class="mt-2 text-sm">
              Enter the actual weight in kilograms, e.g. <strong>2.5</strong> for a 2.5&nbsp;kg parcel.
            </p>
            <p class="mt-2 text-sm">
              Supported range: <strong>${WEIGHT_MIN_KG}&nbsp;kg &ndash; ${WEIGHT_MAX_KG}&nbsp;kg</strong>
            </p>
          `,
          confirmButtonText: 'Fix Weight',
        });
        return;
      }
      if (w > WEIGHT_MAX_KG) {
        setWeightError(`Max ${WEIGHT_MAX_KG} kg`);
        await swal.fire({
          icon: 'error',
          title: 'Weight Exceeds Limit',
          html: `
            <p>We currently support packages up to <strong>${WEIGHT_MAX_KG}&nbsp;kg</strong>.</p>
            <p class="mt-2 text-sm">
              For heavier shipments please contact our logistics team directly.
            </p>
          `,
          confirmButtonText: 'Fix Weight',
        });
        return;
      }
      // All good — clear any stale error
      setWeightError(null);
    }

    // ── Declared Value ───────────────────────────────────────────────────────
    const rawValue = packageInfo.declaredValue;
    if (rawValue !== undefined && rawValue !== null) {
      const val = Number(rawValue);
      if (isNaN(val) || val <= 0) {
        setDeclaredValueError('Must be greater than ₦0');
        await swal.fire({
          icon: 'error',
          title: 'Invalid Declared Value',
          html: `
            <p>Declared item value must be a <strong>positive amount in Naira</strong>.</p>
            <p class="mt-2 text-sm">
              Enter the estimated market value of the item, e.g. <strong>₦5,000</strong>.
            </p>
            <p class="mt-2 text-sm">
              Supported range: <strong>₦${VALUE_MIN_NGN.toLocaleString()} &ndash; ₦${VALUE_MAX_NGN.toLocaleString()}</strong>
            </p>
          `,
          confirmButtonText: 'Fix Value',
        });
        return;
      }
      if (val > VALUE_MAX_NGN) {
        setDeclaredValueError(`Max ₦${VALUE_MAX_NGN.toLocaleString()}`);
        await swal.fire({
          icon: 'warning',
          title: 'Declared Value Too High',
          html: `
            <p>We currently accept declared values up to <strong>₦${VALUE_MAX_NGN.toLocaleString()}</strong>.</p>
            <p class="mt-2 text-sm">
              For high-value items above this limit, please contact our support team.
            </p>
          `,
          confirmButtonText: 'Fix Value',
        });
        return;
      }
      setDeclaredValueError(null);
    }

    // ── All valid ────────────────────────────────────────────────────────────
    onContinue();
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
              value={packageInfo.declaredValue ?? ''}
              onChange={(e) => handleNumberInput('declaredValue', e.target.value)}
              onBlur={handleDeclaredValueBlur}
              className={`w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
                declaredValueError
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-200 dark:border-zinc-700'
              }`}
            />
            {declaredValueError && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {declaredValueError}
              </p>
            )}
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
              value={packageInfo.weightKg ?? ''}
              onChange={(e) => handleNumberInput('weightKg', e.target.value)}
              onBlur={handleWeightBlur}
              className={`w-full p-3 rounded-xl bg-white dark:bg-zinc-900 border text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
                weightError
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-gray-200 dark:border-zinc-700'
              }`}
            />
            {weightError && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {weightError}
              </p>
            )}
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
        onClick={handleValidateAndContinue}
        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl shadow-lg shadow-yellow-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        Calculate Price <ChevronRight size={18} />
      </button>
    </div>
  );
}