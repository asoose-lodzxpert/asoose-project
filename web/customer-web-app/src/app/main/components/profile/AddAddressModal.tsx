"use client";

import React, { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { LocationInput } from "@/components/shared/LocationInput";

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
    isDefault: false,
  });
  // Coordinates captured from the debounced place search
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      // Require a place to be selected so we have real coords
      alert("Please select an address from the suggestions.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        street: formData.street,
        isDefault: formData.isDefault,
        lat: coords.lat,
        lng: coords.lng,
      };

      await onSave(payload);

      onClose();
      setFormData({ street: "", isDefault: false });
      setCoords(null);
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
          {/* Street — debounced place search via backend */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">
              Search Address
            </label>
            <div className="mt-1">
              <LocationInput
                value={formData.street}
                onValueChange={(val) => {
                  setFormData((f) => ({ ...f, street: val }));
                  // Clear coords when user starts typing again
                  setCoords(null);
                }}
                onLocationSelect={(loc, address) => {
                  setCoords({ lat: loc.lat, lng: loc.lng });
                  setFormData((f) => ({ ...f, street: address }));
                }}
                placeholder="Search street, area or landmark…"
                showGeolocation
              />
            </div>
            {coords && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location pinned
              </p>
            )}
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
            disabled={loading || !coords}
            className="w-full mt-4 bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
