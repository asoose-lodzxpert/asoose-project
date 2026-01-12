'use client';

import React, { useState } from 'react';
import { 
  CreditCard, Banknote, ChevronLeft, Check, Loader2, Zap, ChevronDown 
} from 'lucide-react';
import { PriceEstimate, PriceBreakdown } from '@/services/ride.service';
import FareBreakdown from './fareBreakdown';
export type RideType = 'Standard' | 'Premium' | 'XL';

export interface RideRequestData {
  rideType: RideType;
  paymentMethodId: string;
  price: number;
}

const PAYMENT_OPTIONS = [
  { id: 'visa-4242', label: 'Visa •••• 4242', icon: <CreditCard size={18} /> },
  { id: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
];

interface RideSelectorProps {
  destination: string;
  pickupAddress: string;
  onSearchClick: () => void;
  priceEstimates: PriceEstimate | null;
  isCalculatingPrice: boolean;
  onRequestRide: (data: RideRequestData) => void;
  isRequesting: boolean;
}

export default function RideSelector({ 
  destination, 
  pickupAddress,
  onSearchClick, 
  priceEstimates,
  isCalculatingPrice,
  onRequestRide,
  isRequesting
}: RideSelectorProps) {
  
  const [selectedRide, setSelectedRide] = useState<RideType>('Standard');
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_OPTIONS[0]);
  const [isSelectingPayment, setIsSelectingPayment] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleConfirm = () => {
    if (!priceEstimates) return;
    const tier = priceEstimates[selectedRide];
    onRequestRide({
      rideType: selectedRide,
      paymentMethodId: selectedPayment.id,
      price: tier.total
    });
  };

  return (
    <div className="flex flex-col h-full font-sans bg-white dark:bg-[#0a0a0a] overflow-hidden transition-colors duration-300">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-xl p-3 space-y-3 relative border dark:border-zinc-800">
              <div className="absolute left-[23px] top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-zinc-800" />
              <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 z-10 ml-1" />
                  <span className="text-sm font-medium text-gray-600 dark:text-zinc-400 truncate">{pickupAddress}</span>
              </div>
              <button onClick={onSearchClick} className="w-full flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 z-10 ml-1" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{destination || 'Where to?'}</span>
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {isSelectingPayment ? (
          <div className="animate-in slide-in-from-right-10">
            <button onClick={() => setIsSelectingPayment(false)} className="flex items-center gap-2 mb-4 text-gray-600 dark:text-zinc-400">
                <ChevronLeft size={20} /> <span className="font-bold">Payment</span>
            </button>
            {PAYMENT_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => { setSelectedPayment(opt); setIsSelectingPayment(false); }} className="w-full flex items-center justify-between p-4 mb-2 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="flex items-center gap-3 dark:text-zinc-300">{opt.icon} <span className="font-semibold">{opt.label}</span></div>
                    {selectedPayment.id === opt.id && <Check size={18} className="text-emerald-500" />}
                </button>
            ))}
          </div>
        ) : (
          <div className="animate-in fade-in">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Choose a ride</h2>
            <div className="space-y-3">
              {(['Standard', 'Premium', 'XL'] as RideType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setSelectedRide(type); setShowBreakdown(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all
                    ${selectedRide === type 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 hover:bg-gray-50 dark:hover:bg-zinc-900'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{type === 'Standard' ? '🚗' : type === 'Premium' ? '🚐' : '🚙'}</div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 dark:text-white">{type}</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        {priceEstimates ? `${priceEstimates.durationMin} min away` : 'Estimating...'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-lg dark:text-white">
                      {isCalculatingPrice ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `₦${priceEstimates?.[type].total.toLocaleString() || '---'}`}
                    </span>
                    {priceEstimates?.isSurgeActive && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">Surge</span>}
                  </div>
                </button>
              ))}
            </div>

            {priceEstimates && (
              <div className="mt-4">
                  <button onClick={() => setShowBreakdown(!showBreakdown)} className="flex items-center gap-1 text-xs font-bold text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
                      {showBreakdown ? 'Hide Details' : 'Show fare breakdown'} <ChevronDown size={14} className={showBreakdown ? 'rotate-180' : ''} />
                  </button>
                  {showBreakdown && <FareBreakdownUI breakdown={priceEstimates[selectedRide]} rideType={selectedRide} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
        <div className="flex items-center justify-between mb-4">
            <button onClick={() => setIsSelectingPayment(true)} className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-zinc-300">
                {selectedPayment.icon} {selectedPayment.label} <span className="text-emerald-600 dark:text-emerald-400 text-xs">Change</span>
            </button>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={isRequesting || !priceEstimates || isCalculatingPrice}
          className="w-full py-4 rounded-xl font-bold text-white dark:text-black bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-zinc-200 transition-all disabled:opacity-50"
        >
          {isRequesting ? <Loader2 className="animate-spin mx-auto" /> : `Confirm ${selectedRide}`}
        </button>
      </div>
    </div>
  );
}