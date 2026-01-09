'use client';

import React, { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';

interface TripCompleteUIProps {
  pickup: string;
  dropoff: string;
  price: number;
  date: string;
  driverName: string;
  onClose: () => void;
}

export default function TripCompleteUI({ pickup, dropoff, price, date, driverName, onClose }: TripCompleteUIProps) {
  const [rating, setRating] = useState(0);

  return (
    <div className="h-full bg-white flex flex-col font-sans animate-in zoom-in-95 duration-300 md:rounded-3xl overflow-hidden">
      
      {/* HEADER */}
      <div className="pt-6 pb-2 text-center">
        <h1 className="text-xl font-bold text-gray-900">Trip Complete</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
        
        {/* MAP CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
           {/* Visual Map Placeholder (Green Gradient) */}
           <div className="h-24 bg-gradient-to-b from-emerald-50 to-white relative flex items-center justify-center">
              {/* Simple Route Visual */}
              <div className="w-48 h-1 bg-sky-400 rounded-full relative">
                 <div className="absolute -left-1 -top-1.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                 <div className="absolute -right-1 -top-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
              </div>
           </div>
           
           {/* Addresses */}
           <div className="p-4 pt-0">
             <div className="flex items-center gap-3 mb-2">
               <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[10px]">P</div>
               <span className="text-sm font-medium text-gray-600 truncate">{pickup}</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-[10px]">D</div>
               <span className="text-sm font-medium text-gray-600 truncate">{dropoff}</span>
             </div>
           </div>

           <div className="grid grid-cols-3 border-t border-gray-50 py-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">3.2 mi</p>
                <p className="text-xs text-gray-400">Distance</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">12 min</p>
                <p className="text-xs text-gray-400">Time</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">3:45 PM</p>
                <p className="text-xs text-gray-400">Today</p>
              </div>
           </div>
        </div>

        {/* FARE BREAKDOWN */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Fare Breakdown</h3>
          <div className="space-y-2 text-sm">
             <div className="flex justify-between text-gray-500">
                <span>Base fare</span>
                <span>$8.00</span>
             </div>
             <div className="flex justify-between text-gray-500">
                <span>Distance (3.2 mi)</span>
                <span>$3.20</span>
             </div>
             <div className="flex justify-between text-gray-500">
                <span>Time (12 min)</span>
                <span>$2.40</span>
             </div>
             <div className="flex justify-between text-gray-500">
                <span>Surge (1.2x)</span>
                <span>+$1.90</span>
             </div>
             <div className="border-t border-gray-100 my-2 pt-2 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-yellow-500">${price.toFixed(2)}</span>
             </div>
          </div>
          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex justify-between items-center text-xs text-gray-500">
             <span>Paid with Visa ••1234</span>
             <span className="text-emerald-600 font-bold cursor-pointer">View Receipt</span>
          </div>
        </div>

        {/* RATING */}
        <div className="text-center">
           <p className="text-lg font-bold text-gray-900 mb-1">How was your ride with {driverName}?</p>
           <p className="text-sm text-gray-400 mb-4">Select a rating to continue</p>
           
           <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRating(star)}
                  className="transition transform hover:scale-110 active:scale-95"
                >
                   <Star 
                     size={36} 
                     className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}`} 
                   />
                </button>
              ))}
           </div>

           <button 
             onClick={onClose}
             className="w-full py-4 rounded-xl font-bold text-white bg-slate-900 shadow-lg mb-3"
           >
             Submit Rating
           </button>
           
           <button onClick={onClose} className="text-sm font-semibold text-gray-400 hover:text-gray-600">
             Skip for now
           </button>
        </div>

      </div>
    </div>
  );
}