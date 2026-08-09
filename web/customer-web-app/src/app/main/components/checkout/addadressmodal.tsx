"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, Loader2, AlertCircle } from "lucide-react";
import { LocationInput } from "@/components/shared/LocationInput";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const INITIAL_FORM = { street: "", phone: "", label: "Home" };

export const AddAddressModal = ({
  isOpen,
  onClose,
  onSave,
}: AddAddressModalProps) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<{
    street?: string;
    phone?: string;
    general?: string;
  }>({});

  // Reset form each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setCoords(null);
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.street.trim())
      newErrors.street = "Please search and select an address.";
    else if (!coords)
      newErrors.street =
        "Please select an address from the suggestions to pin your location.";
    if (!formData.phone.trim()) newErrors.phone = "Contact phone is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLocating(true);
    setErrors({});
    try {
      await onSave({
        street: formData.street,
        phone: formData.phone,
        // Backend AddressLabel enum is uppercase ("HOME"|"WORK"|"OTHER");
        // the picker below displays Title Case.
        label: formData.label.toUpperCase(),
        lat: coords!.lat,
        lng: coords!.lng,
      });
    } catch (error: any) {
      console.error("Address save error:", error);
      setErrors({
        general: error?.message || "Failed to save address. Please try again.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
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

        {errors.general && (
          <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <div className="flex gap-2">
              {["Home", "Work", "Other"].map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setFormData({ ...formData, label: l })}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                    formData.label === l
                      ? "bg-yellow-500 border-yellow-500 text-black"
                      : "border-gray-200 dark:border-white/10 hover:border-yellow-500"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Debounced address search — calls backend, no excess queries */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Search Address <span className="text-red-500">*</span>
            </label>
            <LocationInput
              value={formData.street}
              onValueChange={(val) => {
                setFormData((f) => ({ ...f, street: val }));
                setCoords(null);
                if (errors.street)
                  setErrors((e) => ({ ...e, street: undefined }));
              }}
              onLocationSelect={(loc, address) => {
                setCoords({ lat: loc.lat, lng: loc.lng });
                setFormData((f) => ({ ...f, street: address }));
                setErrors((e) => ({ ...e, street: undefined }));
              }}
              placeholder="Search street, area or landmark…"
              showGeolocation
            />
            {coords && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location pinned
              </p>
            )}
            {errors.street && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.street}
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border outline-none transition-colors ${
                errors.phone
                  ? "border-red-400 dark:border-red-500 focus:border-red-500"
                  : "border-gray-200 dark:border-white/10 focus:border-yellow-500"
              }`}
              placeholder="e.g. 08012345678"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (errors.phone)
                  setErrors((er) => ({ ...er, phone: undefined }));
              }}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.phone}
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLocating}
              className="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl shadow-lg hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Save Address
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
