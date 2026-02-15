"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  ChevronLeft,
  Check,
  Loader2,
  ChevronDown,
} from "lucide-react";
import FareBreakdown from "./fareBreakdown";
import LocationAutocomplete from "./LocationAutocomplete";
import { PAYMENT_METHODS } from "../constants/config";

export interface RideType {
  id: string; // Maps directly to Backend VehicleType Enum (e.g., "ECONOMY", "BUSINESS")
  displayName: string;
  icon?: string;
}

export interface LocationData {
  address: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

// 🛑 ARCHITECTURE FIX: Price is strictly removed to prevent fare spoofing.
// Payload keys updated to match backend RequestRideDto perfectly.
export interface RideRequestPayload {
  pickupLocation: {
    addressText: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  dropoffLocation: {
    addressText: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  vehicleType: string;
  paymentMethodId: string;
}

export interface PriceEstimate {
  [key: string]: {
    estimatedFare: number;
    distance: number;
    duration: number;
    total: number;
    breakdown: any;
  };
}

interface RideSelectorProps {
  pickupAddress: string;
  destinationAddress: string;
  onPickupSelect: (data: LocationData) => void;
  onDestinationSelect: (data: LocationData) => void;
  priceEstimates: PriceEstimate | null;
  isCalculatingPrice: boolean;
  onRequestRide: (data: RideRequestPayload) => void;
  isRequesting: boolean;
  isGoogleLoaded: boolean;
  availableRideTypes: RideType[]; // SSOT: Strictly sourced from backend config
}

export default function RideSelector({
  pickupAddress,
  destinationAddress,
  onPickupSelect,
  onDestinationSelect,
  priceEstimates,
  isCalculatingPrice,
  onRequestRide,
  isRequesting,
  isGoogleLoaded,
  availableRideTypes,
}: RideSelectorProps) {
  const [selectedRideId, setSelectedRideId] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [isSelectingPayment, setIsSelectingPayment] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [pickupLoc, setPickupLoc] = useState<LocationData | null>(null);
  const [dropoffLoc, setDropoffLoc] = useState<LocationData | null>(null);

  useEffect(() => {
    // Auto-select the first backend-provided ride type when loaded
    if (availableRideTypes.length > 0 && !selectedRideId) {
      setSelectedRideId(availableRideTypes[0].id);
    }
  }, [availableRideTypes, selectedRideId]);

  const handleConfirm = () => {
    if (!selectedRideId || !pickupLoc || !dropoffLoc) return;

    // 1. Strict Validation: Ensure selected ride exists in the backend-provided list
    const validVehicle = availableRideTypes.find((t) => t.id === selectedRideId);
    if (!validVehicle) {
      console.error(`Validation Failed: ${selectedRideId} is not a valid vehicle type.`);
      return; 
    }

    // 2. Contract Fix: Send the exact DTO required by the backend.
    // 🛑 We DO NOT send `price`. The backend recalculates it securely.
    onRequestRide({
      pickupLocation: {
        addressText: pickupLoc.address || pickupAddress || "Pickup Location",
        placeId: pickupLoc.placeId,
        lat: pickupLoc.lat,
        lng: pickupLoc.lng,
      },
      dropoffLocation: {
        addressText: dropoffLoc.address || destinationAddress || "Dropoff Location",
        placeId: dropoffLoc.placeId,
        lat: dropoffLoc.lat,
        lng: dropoffLoc.lng,
      },
      vehicleType: validVehicle.id, // Strictly uses the backend ID (e.g., 'BUSINESS')
      paymentMethodId: selectedPayment.id,
    });
  };

  const getIcon = (type: string) => {
    return type === "CARD" ? <CreditCard size={18} /> : <Banknote size={18} />;
  };

  const getRideIcon = (type: RideType) => {
    if (type.icon) return <img src={type.icon} alt={type.displayName} className="w-8 h-8" />;
    const id = type.id.toLowerCase();
    if (id.includes("business") || id.includes("premium")) return "🚙";
    if (id.includes("bike")) return "🏍️";
    return "🚗"; // Default to economy/standard car
  };

  return (
    <div className="flex flex-col h-full font-sans bg-white dark:bg-[#0a0a0a] overflow-hidden transition-colors duration-300">
      {/* Location Inputs */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 shadow-sm z-20">
        <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-2 space-y-2 relative border border-gray-100 dark:border-zinc-800">
          <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-zinc-700 pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10 bg-white dark:bg-black/20 rounded-xl px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-1.5 ring-4 ring-white dark:ring-zinc-900" />
            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                placeholder="Pickup Location"
                initialValue={pickupAddress}
                onSelect={(d) => {
                  setPickupLoc(d);
                  onPickupSelect(d);
                }}
                isLoaded={isGoogleLoaded}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 bg-white dark:bg-black/20 rounded-xl px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ml-1.5 ring-4 ring-white dark:ring-zinc-900" />
            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                placeholder="Where to?"
                initialValue={destinationAddress}
                showPinpoint={false}
                onSelect={(d) => {
                  setDropoffLoc(d);
                  onDestinationSelect(d);
                }}
                isLoaded={isGoogleLoaded}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ride/Payment Selection Content */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {isSelectingPayment ? (
          <div className="animate-in slide-in-from-right-10">
            <button onClick={() => setIsSelectingPayment(false)} className="flex items-center gap-2 mb-4 text-gray-600 dark:text-zinc-400">
              <ChevronLeft size={20} /> <span className="font-bold">Back to rides</span>
            </button>
            <h3 className="text-lg font-bold mb-4 dark:text-white">Payment Method</h3>
            {PAYMENT_METHODS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSelectedPayment(opt); setIsSelectingPayment(false); }}
                className="w-full flex items-center justify-between p-4 mb-2 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center gap-3 dark:text-zinc-300">
                  {getIcon(opt.type)}
                  <span className="font-semibold">{opt.label}</span>
                </div>
                {selectedPayment.id === opt.id && <Check size={18} className="text-emerald-500" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Suggested Rides</h2>

            {availableRideTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                {isGoogleLoaded ? (
                  <><Loader2 className="animate-spin mb-2" /><p className="text-xs">Loading options...</p></>
                ) : (
                  <p className="text-xs">Waiting for map...</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {availableRideTypes.map((type) => {
                  const estimate = priceEstimates ? priceEstimates[type.id] : null;

                  return (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedRideId(type.id); setShowBreakdown(false); }}
                      disabled={!estimate}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-wait
                            ${selectedRideId === type.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 hover:bg-gray-50 dark:hover:bg-zinc-900"}
                          `}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl flex items-center justify-center w-10">
                          {getRideIcon(type)}
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-gray-900 dark:text-white">{type.displayName}</h3>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {estimate ? `${estimate.duration} min` : "..."}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-bold text-lg dark:text-white">
                          {/* Price is strictly for display; actual deduction relies on backend server calc */}
                          {isCalculatingPrice ? <Loader2 className="w-4 h-4 animate-spin inline" /> : estimate ? `₦${estimate.total.toLocaleString()}` : "---"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {priceEstimates && selectedRideId && priceEstimates[selectedRideId] && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {showBreakdown ? "Hide Details" : "Show fare breakdown"} <ChevronDown size={14} className={showBreakdown ? "rotate-180" : ""} />
                  </button>
                  {showBreakdown && (
                    <FareBreakdown breakdown={priceEstimates[selectedRideId].breakdown} rideType={availableRideTypes.find((t) => t.id === selectedRideId)?.displayName || selectedRideId} />
                  )}
                </div>
              )}
          </div>
        )}
      </div>

      {/* Footer / Confirm Action */}
      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setIsSelectingPayment(true)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300">
            {getIcon(selectedPayment.type)} {selectedPayment.label} <span className="text-emerald-600 dark:text-emerald-400 text-xs">Change</span>
          </button>
        </div>
        <button
          onClick={handleConfirm}
          disabled={isRequesting || isCalculatingPrice || !selectedRideId || !pickupLoc || !dropoffLoc}
          className="w-full py-4 rounded-xl font-bold text-white dark:text-black bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
        >
          {isRequesting ? <Loader2 className="animate-spin mx-auto" /> : `Confirm ${availableRideTypes.find((t) => t.id === selectedRideId)?.displayName || "Ride"}`}
        </button>
      </div>
    </div>
  );
}