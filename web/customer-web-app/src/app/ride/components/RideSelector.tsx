'use client';

import React, { useState } from 'react';
import { 
  ArrowUpDown, Home, Briefcase, CreditCard, 
  Wallet, Banknote, ChevronLeft, Check, Loader2 
} from 'lucide-react';
import { PriceEstimate } from '@/services/ride.service';

// --- Types ---
export type RideType = 'Standard' | 'Premium' | 'XL';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'cash' | 'wallet';
  label: string;
  icon: React.ReactNode;
}

export interface RideRequestData {
  rideType: RideType;
  paymentMethodId: string;
  price: number;
}

const PAYMENT_OPTIONS: PaymentMethod[] = [
  { id: 'visa-4242', type: 'card', label: 'Visa •••• 4242', icon: <CreditCard size={18} /> },
  { id: 'cash', type: 'cash', label: 'Cash', icon: <Banknote size={18} /> },
  { id: 'wallet', type: 'wallet', label: 'Wallet Balance (₦5,000)', icon: <Wallet size={18} /> },
];

interface RideSelectorProps {
  destination: string;
  pickupAddress: string;
  onSearchClick: () => void;
  
  // New Props for Data
  priceEstimates: PriceEstimate | null;
  isCalculatingPrice: boolean;

  // Actions
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
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(PAYMENT_OPTIONS[0]);
  const [isSelectingPayment, setIsSelectingPayment] = useState(false);

  // --- Helper: Format Price ---
  const getPrice = (type: RideType) => {
    if (!priceEstimates) return 0;
    return priceEstimates[type];
  };

  const getFormattedPrice = (type: RideType) => {
    if (isCalculatingPrice) return '...';
    if (!priceEstimates) return '-';
    return priceEstimates[type].toLocaleString();
  };

  // --- Handler: Confirm Ride ---
  const handleConfirm = () => {
    if (!priceEstimates) return;
    
    onRequestRide({
      rideType: selectedRide,
      paymentMethodId: selectedPayment.id,
      price: getPrice(selectedRide)
    });
  };

  const rideOptions: RideType[] = ['Standard', 'Premium', 'XL'];

  return (
    <div className="flex flex-col h-full justify-between pointer-events-none md:pointer-events-auto font-sans">
      
      {/* --- TOP: INPUTS --- */}
      {!isSelectingPayment && (
        <div className="pointer-events-auto p-4 md:p-6 bg-transparent md:bg-white animate-in fade-in">
           {/* Mobile Background Gradient */}
           <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/90 to-transparent h-48 -z-10 md:hidden" />
           
           <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 p-4 relative md:shadow-none md:border md:border-gray-100">
             <div className="flex flex-col gap-4 relative">
                <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-50 p-2 rounded-full border border-gray-100 shadow-sm hover:bg-gray-100 z-20">
                  <ArrowUpDown className="w-4 h-4 text-gray-500" />
                </button>
                <div className="absolute left-[11px] top-8 bottom-8 w-0.5 bg-gray-200" />
                
                {/* Pickup */}
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <input type="text" value={pickupAddress} readOnly className="w-full text-sm font-semibold text-gray-800 bg-gray-50 rounded-lg px-3 py-2 outline-none truncate" />
                </div>
                
                {/* Destination */}
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  </div>
                  <input type="text" readOnly onClick={onSearchClick} value={destination} placeholder="Where to?" className="w-full cursor-pointer text-sm font-semibold text-gray-800 bg-gray-50 rounded-lg px-3 py-2 outline-none placeholder:text-gray-400" />
                </div>
             </div>
           </div>
           
           <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar pb-2">
              <Chip icon={<Home size={14} />} label="Home" />
              <Chip icon={<Briefcase size={14} />} label="Work" />
           </div>
        </div>
      )}

      {/* --- SPACER --- */}
      <div className="flex-1 md:hidden" /> 

      {/* --- BOTTOM SHEET --- */}
      <div className="
        pointer-events-auto bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] p-5 pb-8
        md:shadow-none md:rounded-none md:p-6 md:flex-1 md:overflow-y-auto transition-all duration-300
      ">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />

        {/* VIEW 1: PAYMENT SELECTOR */}
        {isSelectingPayment ? (
          <div className="animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setIsSelectingPayment(false)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Payment Method</h2>
            </div>
            
            <div className="flex flex-col gap-2">
              {PAYMENT_OPTIONS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => { setSelectedPayment(method); setIsSelectingPayment(false); }}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedPayment.id === method.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-50 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">{method.icon}</div>
                    <span className="font-semibold text-gray-800">{method.label}</span>
                  </div>
                  {selectedPayment.id === method.id && <Check size={18} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* VIEW 2: RIDE SELECTOR */
          <div className="animate-in slide-in-from-left-10 fade-in duration-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 hidden md:block">Select a Ride</h2>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 no-scrollbar md:flex-col md:mx-0 md:px-0 md:overflow-visible">
              {rideOptions.map((type) => (
                <div 
                  key={type}
                  onClick={() => setSelectedRide(type)}
                  className={`
                    relative cursor-pointer transition-all duration-200 rounded-xl border-2 p-3 flex flex-col justify-between
                    min-w-[140px] md:w-full md:flex-row md:items-center
                    ${selectedRide === type ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div className="mb-2 md:mb-0 md:mr-4 text-4xl">{type === 'Standard' ? '🚗' : type === 'Premium' ? '🚐' : '🚙'}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{type}</h3>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                       {priceEstimates ? (
                         <>
                           <span>{(priceEstimates.distanceKm).toFixed(1)} km</span>
                           <span>•</span>
                           <span>{priceEstimates.durationMin} min</span>
                         </>
                       ) : isCalculatingPrice ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Nearby'}
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 md:text-right">
                    <span className="block font-bold text-lg text-gray-900">₦{getFormattedPrice(type)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 md:mt-auto">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2 text-gray-700">
                    <div className="bg-slate-100 p-1 rounded">{selectedPayment.icon}</div>
                    <span className="text-sm font-semibold">{selectedPayment.label}</span>
                 </div>
                 <button onClick={() => setIsSelectingPayment(true)} className="text-xs font-bold text-emerald-600 cursor-pointer hover:text-emerald-700 hover:underline">Change</button>
              </div>
              
              <button 
                onClick={handleConfirm}
                disabled={isRequesting || !priceEstimates || isCalculatingPrice}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  `Confirm ${selectedRide}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm whitespace-nowrap hover:bg-gray-50 transition">
      <span className="text-amber-500">{icon}</span>
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </button>
  );
}