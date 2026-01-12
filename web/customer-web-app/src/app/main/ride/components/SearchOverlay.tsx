'use client';

import React from 'react';
import { Phone, MessageSquare, ChevronDown, ShieldAlert, MapPin, Star } from 'lucide-react';

export type TripStatus = 'ON_WAY' | 'ARRIVED';

interface DriverStatusUIProps {
  status: TripStatus;
  etaMinutes?: number;
  driver: any;
  tripDetails: any;
  onCancel: () => void;
}

export default function DriverStatusUI({ status, etaMinutes = 3, driver, tripDetails }: DriverStatusUIProps) {

  return (
    <div className="h-full flex flex-col justify-between pointer-events-none md:pointer-events-auto font-sans relative">
      
      {/* --- DRIVER ON WAY BANNER --- */}
      {status === 'ON_WAY' && (
        <div className="pointer-events-auto mx-4 mt-4 animate-in slide-in-from-top-10 fade-in duration-500">
          <div className="bg-white rounded-2xl shadow-xl p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Driver is on the way</h2>
              <p className="text-emerald-600 font-semibold text-sm">Arriving in {etaMinutes} minutes</p>
            </div>
            {/* Red Alert Button from Screenshot */}
            <button className="bg-red-500 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 active:scale-95 transition">
              <ShieldAlert size={20} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* --- BOTTOM SHEET --- */}
      <div className="
        pointer-events-auto bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.1)] 
        pb-8 pt-2 relative animate-in slide-in-from-bottom-20 duration-500
        md:rounded-3xl md:m-4 md:shadow-2xl
      ">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-6" />

        <div className="px-6">
          
          {/* ARRIVED HEADER (Green Text) */}
          {status === 'ARRIVED' && (
            <div className="text-center mb-6 animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-bold text-emerald-500 mb-1">Driver has arrived!</h2>
              <p className="text-gray-500 text-sm">Your ride is ready</p>
            </div>
          )}

          {/* DRIVER PROFILE */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shrink-0 border-2 border-white shadow-sm">
              SJ
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                <div className="flex items-center gap-1">
                   <Star size={12} className="text-yellow-400 fill-yellow-400" />
                   <span className="text-xs font-bold text-gray-700">{driver.rating}</span>
                   <span className="text-xs text-gray-400">({driver.trips} trips)</span>
                </div>
              </div>
              
              <div className="text-sm font-medium text-gray-600 mt-1">
                {driver.carModel} <span className="mx-1">•</span> <span className="font-bold text-gray-900">{driver.plate}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">
              <Phone size={18} /> Call
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">
              <MessageSquare size={18} /> Message
            </button>
          </div>

          {/* WAITING BANNER */}
          {status === 'ARRIVED' ? (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3 mb-4">
              <MapPin size={20} className="text-red-500 fill-red-500" />
              <p className="text-sm font-semibold text-gray-700">
                Your driver is waiting at <span className="text-gray-900">{tripDetails.pickup.split(',')[0]}</span>
              </p>
            </div>
          ) : (
            /* TRIP DETAILS DROPDOWN */
            <div className="border-t border-gray-100 pt-4">
               <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-gray-900">Trip Details</span>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
              <div className="flex flex-col gap-4 relative pl-2">
                <div className="absolute left-[9px] top-2 bottom-6 w-0.5 bg-gray-200" />
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white border-[5px] border-emerald-500 z-10" />
                  <span className="text-sm font-medium text-gray-600 truncate">{tripDetails.pickup}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white border-[5px] border-red-500 z-10" />
                  <span className="text-sm font-medium text-gray-600 truncate">{tripDetails.dropoff}</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                 <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Trip Price</p>
                 <p className="text-3xl font-bold text-yellow-500">${tripDetails.price.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}