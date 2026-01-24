'use client';

import React, { useState } from 'react';
import { X, MapPin, Loader2, Phone } from 'lucide-react'; // Added Phone icon
import { toast } from 'react-toastify';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const AddAddressModal = ({ isOpen, onClose, onSave }: AddAddressModalProps) => {
  // ✅ ADDED: 'phone' to state
  const [formData, setFormData] = useState({ 
    street: '', 
    city: '', 
    phone: '', 
    label: 'Home', 
    state: 'Maiduguri' 
  });
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ ADDED: Validation for phone
    if (!formData.street || !formData.city || !formData.phone) {
      toast.error('Please fill in street, city, and phone number');
      return;
    }

    setIsLocating(true);

    try {
      // Mock Coordinates (Aligning with Profile Page Logic)
      const MAIDUGURI_COORDS = {
        lat: 11.8311,
        lng: 13.1510
      };

      await new Promise(resolve => setTimeout(resolve, 800));

      await onSave({
        ...formData,
        lat: MAIDUGURI_COORDS.lat,
        lng: MAIDUGURI_COORDS.lng,
      });

      // Reset form
      setFormData({ street: '', city: '', phone: '', label: 'Home', state: 'Maiduguri' });
      onClose();
    } catch (error: any) {
      console.error("Address save error:", error);
      toast.error('Failed to save address. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Address</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setFormData({ ...formData, label: l })}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                    formData.label === l
                      ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'border-gray-200 dark:border-white/10 hover:border-yellow-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Street Address</label>
            <input
              type="text"
              required
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-yellow-500 outline-none transition-colors"
              placeholder="e.g. 123 Lagos Street"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            />
          </div>

          {/* ✅ ADDED: Phone Input Field */}
          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <div className="relative">
              <input
                type="tel"
                required
                className="w-full p-3 pl-10 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-yellow-500 outline-none transition-colors"
                placeholder="e.g. 08012345678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                required
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-yellow-500 outline-none"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input
                type="text"
                disabled
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 cursor-not-allowed"
                value={formData.state}
              />
            </div>
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
                  Verifying Location...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Save Address
                </>
              )}
            </button>
            <p className="text-xs text-center mt-3 text-gray-500">
              Address location is pinned to Maiduguri for service validation.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};