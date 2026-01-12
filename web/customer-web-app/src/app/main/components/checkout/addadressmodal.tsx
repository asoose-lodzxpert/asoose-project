'use client';

import React, { useState } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export const AddAddressModal = ({ isOpen, onClose, onSave }: AddAddressModalProps) => {
  const [formData, setFormData] = useState({ street: '', city: '', label: 'Home', state: 'Maiduguri' });
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.street || !formData.city) {
      toast.error('Please fill in street and city');
      return;
    }

    setIsLocating(true);

    try {
      // 1. Get Real Coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      // 2. Pass data + coords back to parent
      await onSave({
        ...formData,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });

      // Reset form on success
      setFormData({ street: '', city: '', label: 'Home', state: 'Maiduguri' });
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === 1) {
        toast.error('Location permission denied. We need your location for delivery.');
      } else {
        toast.error('Could not fetch location. Please ensure GPS is enabled.');
      }
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
                  Acquiring GPS...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Save Address
                </>
              )}
            </button>
            <p className="text-xs text-center mt-3 text-gray-500">
              We will request your GPS location to ensure you are in our service area.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};