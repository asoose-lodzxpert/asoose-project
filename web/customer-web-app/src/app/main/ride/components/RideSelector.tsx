'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Banknote, ChevronLeft, Check, Loader2, ChevronDown, AlertCircle
} from 'lucide-react';
import { PriceEstimate, RideRequestPayload, RideType } from '@/services/ride.service';
import FareBreakdown from './fareBreakdown';
import LocationAutocomplete from './LocationAutocomplete';
import { PAYMENT_METHODS } from '../constants/config'; // Ensure this exists or define inline if preferred

interface RideSelectorProps {
  pickupAddress: string;
  destinationAddress: string;
  onPickupSelect: (data: { address: string; lat: number; lng: number }) => void;
  onDestinationSelect: (data: { address: string; lat: number; lng: number }) => void;
  priceEstimates: PriceEstimate | null;
  isCalculatingPrice: boolean;
  onRequestRide: (data: RideRequestPayload) => void;
  isRequesting: boolean;
  isGoogleLoaded: boolean;
  availableRideTypes: RideType[]; // NEW: Dynamic types from backend
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
  availableRideTypes
}: RideSelectorProps) {
  
  // Initialize with the first available type ID or empty string
  const [selectedRideId, setSelectedRideId] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [isSelectingPayment, setIsSelectingPayment] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Auto-select the first ride type when data loads
  useEffect(() => {
    if (availableRideTypes.length > 0 && !selectedRideId) {
      setSelectedRideId(availableRideTypes[0].id);
    }
  }, [availableRideTypes, selectedRideId]);

const handleConfirm = () => {
    if (!priceEstimates || !selectedRideId) return;
    const tier = (priceEstimates as any)[selectedRideId];
    
    onRequestRide({
      pickup: { lat: 0, lng: 0, address: pickupAddress },
      dropoff: { lat: 0, lng: 0, address: destinationAddress },
      rideType: selectedRideId, 
      paymentMethodId: selectedPayment.id, // This is passed to parent
      price: tier.total
    });
  };

  const getIcon = (type: string) => {
    return type === 'CARD' ? <CreditCard size={18} /> : <Banknote size={18} />;
  };

  // Helper to get emoji/icon based on backend ID (fallback logic)
  const getRideIcon = (type: RideType) => {
    if (type.icon) return <img src={type.icon} alt={type.displayName} className="w-8 h-8" />;
    // Fallback based on ID naming convention
    const id = type.id.toLowerCase();
    if (id.includes('premium')) return '🚐';
    if (id.includes('xl')) return '🚙';
    return '🚗';
  };

  return (
    <div className="flex flex-col h-full font-sans bg-white dark:bg-[#0a0a0a] overflow-hidden transition-colors duration-300">
      
      {/* --- INPUT HEADER --- */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 shadow-sm z-20">
          <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-2 space-y-2 relative border border-gray-100 dark:border-zinc-800">
              {/* Connector Line */}
              <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-zinc-700 pointer-events-none" />
              
              {/* Pickup Input */}
              <div className="flex items-center gap-3 relative z-10 bg-white dark:bg-black/20 rounded-xl px-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-1.5 ring-4 ring-white dark:ring-zinc-900" />
                  <div className="flex-1 min-w-0">
                    <LocationAutocomplete 
                        placeholder="Pickup Location"
                        initialValue={pickupAddress}
                        onSelect={onPickupSelect}
                        isLoaded={isGoogleLoaded}
                    />
                  </div>
              </div>

              {/* Destination Input */}
              <div className="flex items-center gap-3 relative z-10 bg-white dark:bg-black/20 rounded-xl px-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ml-1.5 ring-4 ring-white dark:ring-zinc-900" />
                  <div className="flex-1 min-w-0">
                    <LocationAutocomplete 
                        placeholder="Where to?"
                        initialValue={destinationAddress}
                        showPinpoint={false}
                        onSelect={onDestinationSelect}
                        isLoaded={isGoogleLoaded}
                    />
                  </div>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {isSelectingPayment ? (
          <div className="animate-in slide-in-from-right-10">
            <button onClick={() => setIsSelectingPayment(false)} className="flex items-center gap-2 mb-4 text-gray-600 dark:text-zinc-400">
                <ChevronLeft size={20} /> <span className="font-bold">Back to rides</span>
            </button>
            <h3 className="text-lg font-bold mb-4 dark:text-white">Payment Method</h3>
            {PAYMENT_METHODS.map(opt => (
                <button key={opt.id} onClick={() => { setSelectedPayment(opt); setIsSelectingPayment(false); }} className="w-full flex items-center justify-between p-4 mb-2 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
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
                         <>
                            <Loader2 className="animate-spin mb-2" />
                            <p className="text-xs">Loading options...</p>
                         </>
                    ) : (
                        <p className="text-xs">Waiting for map...</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                  {availableRideTypes.map((type) => {
                    // Safe access to estimates
                    const estimate = priceEstimates ? (priceEstimates[type.id] as any) : null;
                    
                    return (
                        <button
                          key={type.id}
                          onClick={() => { setSelectedRideId(type.id); setShowBreakdown(false); }}
                          disabled={!priceEstimates}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-wait
                            ${selectedRideId === type.id 
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                              : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 hover:bg-gray-50 dark:hover:bg-zinc-900'}
                          `}
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-3xl flex items-center justify-center w-10">
                                {getRideIcon(type)}
                            </div>
                            <div className="text-left">
                              <h3 className="font-bold text-gray-900 dark:text-white">{type.displayName}</h3>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">
                                {priceEstimates ? `${priceEstimates.durationMin} min` : '...'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block font-bold text-lg dark:text-white">
                              {isCalculatingPrice ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (estimate ? `₦${estimate.total.toLocaleString()}` : '---')}
                            </span>
                            {priceEstimates?.isSurgeActive && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Surge</span>}
                          </div>
                        </button>
                    );
                  })}
                </div>
            )}

            {priceEstimates && selectedRideId && (
              <div className="mt-4">
                  <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                      {showBreakdown ? 'Hide Details' : 'Show fare breakdown'} <ChevronDown size={14} className={showBreakdown ? 'rotate-180' : ''} />
                  </button>
                  {showBreakdown && (
                      <FareBreakdown 
                        breakdown={priceEstimates[selectedRideId] as any} 
                        rideType={availableRideTypes.find(t => t.id === selectedRideId)?.displayName || selectedRideId} 
                      />
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => setIsSelectingPayment(true)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300">
                {getIcon(selectedPayment.type)} {selectedPayment.label} <span className="text-emerald-600 dark:text-emerald-400 text-xs">Change</span>
            </button>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={isRequesting || !priceEstimates || isCalculatingPrice || !selectedRideId}
          className="w-full py-4 rounded-xl font-bold text-white dark:text-black bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
        >
          {isRequesting ? <Loader2 className="animate-spin mx-auto" /> : `Confirm ${availableRideTypes.find(t => t.id === selectedRideId)?.displayName || 'Ride'}`}
        </button>
      </div>
    </div>
  );
}