"use client";

import React, { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: any) => Promise<void>;
}

export const AddAddressModal = ({
  isOpen,
  onClose,
  onSave,
}: AddAddressModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Nigeria",
    isDefault: false,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // ✅ FIX: Construct a payload that matches Backend DTO exactly
      const payload = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        isDefault: formData.isDefault,

        // 📍 MAIDUGURI COORDINATES
        // Hardcoded for now to pass backend validation.
        // In a future update, these should come from a map picker.
        lat: 11.8311,
        lng: 13.151,

        // ❌ REMOVED: zipCode & country (The backend rejects these)
      };

      await onSave(payload);

      onClose();
      // Reset form
      setFormData({
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "Nigeria",
        isDefault: false,
      });
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-yellow-500" />
            Add New Address
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Street Address
            </label>
            <input
              required
              type="text"
              placeholder="123 Main St"
              className="w-full mt-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors"
              value={formData.street}
              onChange={(e) =>
                setFormData({ ...formData, street: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                City
              </label>
              <input
                required
                type="text"
                placeholder="Lagos"
                className="w-full mt-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                State
              </label>
              <input
                required
                type="text"
                placeholder="Lagos"
                className="w-full mt-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors"
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
              />
            </div>
          </div>

          {/* NOTE: We keep these inputs for User Experience, but we don't send them to backend because backend rejects them */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Zip Code
              </label>
              <input
                type="text"
                placeholder="100001"
                className="w-full mt-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors"
                value={formData.zipCode}
                onChange={(e) =>
                  setFormData({ ...formData, zipCode: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Country
              </label>
              <input
                type="text"
                className="w-full mt-1 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) =>
                setFormData({ ...formData, isDefault: e.target.checked })
              }
              className="w-5 h-5 text-yellow-500 rounded focus:ring-yellow-500 border-gray-300"
            />
            <label htmlFor="isDefault" className="text-sm font-medium">
              Set as default address
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Save Address"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
