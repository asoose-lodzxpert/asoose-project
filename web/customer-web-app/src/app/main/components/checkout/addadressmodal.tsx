"use client";

import React, { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";
import { LocationInput } from "@/components/shared/LocationInput";

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const AddAddressModal = ({
  isOpen,
  onClose,
  onSave,
}: AddAddressModalProps) => {
  const [formData, setFormData] = useState({
    street: "",
    phone: "",
    label: "Home",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.street || !formData.phone) {
      alert("Please select an address and enter a phone number");
      return;
    }
    if (!coords) {
      alert(
        "Please select an address from the suggestions to pin your location.",
      );
      return;
    }

    setIsLocating(true);
    try {
      await onSave({
        street: formData.street,
        phone: formData.phone,
        label: formData.label,
        lat: coords.lat,
        lng: coords.lng,
      });

      setFormData({ street: "", phone: "", label: "Home" });
      setCoords(null);
      onClose();
    } catch (error: any) {
      console.error("Address save error:", error);
      alert("Failed to save address. Please try again.");
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Address</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              Search Address
            </label>
            <LocationInput
              value={formData.street}
              onValueChange={(val) => {
                setFormData((f) => ({ ...f, street: val }));
                setCoords(null);
              }}
              onLocationSelect={(loc, address) => {
                setCoords({ lat: loc.lat, lng: loc.lng });
                setFormData((f) => ({ ...f, street: address }));
              }}
              placeholder="Search street, area or landmark…"
              showGeolocation
            />
            {coords && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location pinned
              </p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              required
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-yellow-500 outline-none transition-colors"
              placeholder="e.g. 08012345678"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLocating || !coords}
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
