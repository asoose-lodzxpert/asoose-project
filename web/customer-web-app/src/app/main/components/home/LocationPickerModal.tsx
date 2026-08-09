"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Navigation, Loader2 } from "lucide-react";
import LocationInput from "@/components/LocationInput";
import { useRideStore } from "@/app/main/ride/store/ride";
import { ApiService } from "@/services/api.service";

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const setUserLocation = useRideStore((state) => state.setUserLocation);
  const setCityId = useRideStore((state) => state.setCityId);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");

  if (!isOpen) return null;

  const handleLocationSelect = async (address: string, details?: any) => {
    if (details?.lat && details?.lng) {
      setIsResolving(true);
      try {
        setUserLocation({ lat: details.lat, lng: details.lng });

        // Resolve cityId
        const resolved: any = await ApiService.post("/locations/resolve-city", {
          latitude: details.lat,
          longitude: details.lng,
        });
        if (resolved?.city?.id) {
          setCityId(resolved.city.id);
        }
        onClose();
      } catch (error) {
        console.error("Failed to set location:", error);
      } finally {
        setIsResolving(false);
      }
    }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/10 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500 rounded-2xl shadow-lg shadow-yellow-500/20">
                <MapPin className="w-6 h-6 text-black" />
              </div>
              Select Delivery Location
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Choose where you want your orders delivered
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <LocationInput
              value={selectedAddress}
              onChange={(addr, details) => {
                setSelectedAddress(addr);
                if (details) handleLocationSelect(addr, details);
              }}
              placeholder="Search for street, area or city..."
              label=""
            />
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-white/5" />
          </div>

          <button
            disabled={isResolving}
            onClick={() => {
                   // This uses the internal logic of LocationInput if exposed, 
                   // or we can implement it here.
                   // Let's assume the user clicks "Current Location" inside LocationInput component.
                   // But if they want a separate button:
                   navigator.geolocation.getCurrentPosition(async (pos) => {
                       const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                       handleLocationSelect("Current Location", coords);
                   });
            }}
            className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] border-2 border-yellow-500/20 hover:border-yellow-500 hover:bg-yellow-500/5 transition-all group active:scale-[0.98]"
          >
            {isResolving ? (
              <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
            ) : (
              <Navigation className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-bold text-yellow-600 dark:text-yellow-500">
              {isResolving ? "Setting Location..." : "Use Current Location"}
            </span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5">
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            By setting your location, you'll see stores and prices<br/>available in your specific area.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
