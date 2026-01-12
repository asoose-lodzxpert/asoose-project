'use client';

import React from 'react';
import { Package, MapPin, Phone, MessageSquare } from 'lucide-react';

export default function DeliveryProgressUI({ stage, courier }: any) {
  return (
    <div className="p-6 animate-in slide-in-from-bottom-5">
      <div className="mb-8">
        <h2 className="text-2xl font-black dark:text-white">
          {stage === 'COURIER_ASSIGNED' ? 'Courier is arriving' : 'Item is in transit'}
        </h2>
        <p className="text-yellow-600 font-bold">Estimated delivery: 15 mins</p>
      </div>

      {/* Courier Profile Card */}
      <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-2xl border dark:border-zinc-800 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center text-white font-black text-xl">
            {courier?.name?.charAt(0) || 'K'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">{courier?.name || 'Kelvin'}</h3>
            <p className="text-xs text-gray-500">{courier?.vehicle || 'Yamaha Bike • LAG-442'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-white dark:bg-zinc-800 py-3 rounded-xl border dark:border-zinc-700 flex items-center justify-center gap-2 font-bold dark:text-white">
            <Phone size={18} /> Call
          </button>
          <button className="flex-1 bg-white dark:bg-zinc-800 py-3 rounded-xl border dark:border-zinc-700 flex items-center justify-center gap-2 font-bold dark:text-white">
            <MessageSquare size={18} /> Chat
          </button>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="space-y-6 relative pl-6">
        <div className="absolute left-[9px] top-2 bottom-6 w-0.5 bg-gray-200 dark:bg-zinc-800" />
        <div className="flex items-center gap-4 relative">
          <div className={`w-5 h-5 rounded-full z-10 ${stage === 'COURIER_ASSIGNED' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
          <p className="text-sm font-bold dark:text-zinc-300">Courier moving to pickup</p>
        </div>
        <div className="flex items-center gap-4 relative">
          <div className={`w-5 h-5 rounded-full z-10 ${stage === 'PICKED_UP' ? 'bg-yellow-500' : 'bg-gray-300'}`} />
          <p className="text-sm font-bold dark:text-zinc-300">Package collected</p>
        </div>
      </div>
    </div>
  );
}