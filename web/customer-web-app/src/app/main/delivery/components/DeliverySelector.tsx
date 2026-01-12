'use client';

import React, { useState } from 'react';
import { Truck, Bike, Car, Info, Loader2 } from 'lucide-react';

interface DeliverySelectorProps {
  onConfirm: () => void;
}

export default function DeliverySelector({ onConfirm }: DeliverySelectorProps) {
  const [selected, setSelected] = useState('Bike');

  const vehicles = [
    { id: 'Bike', icon: Bike, label: 'Express Bike', price: 1200, time: '8 mins' },
    { id: 'Car', icon: Car, label: 'Standard Car', price: 2500, time: '12 mins' },
    { id: 'Van', icon: Truck, label: 'Large Van', price: 4500, time: '20 mins' },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-black mb-6 dark:text-white">Choose a courier</h2>
      
      <div className="space-y-3 flex-1">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v.id)}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
              selected === v.id
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
                : 'border-gray-50 dark:border-zinc-800 bg-white dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${selected === v.id ? 'bg-yellow-500 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                <v.icon size={24} />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900 dark:text-white">{v.label}</p>
                <p className="text-xs text-gray-500">{v.time} away</p>
              </div>
            </div>
            <p className="font-black text-lg dark:text-white">₦{v.price.toLocaleString()}</p>
          </button>
        ))}
      </div>

      <div className="pt-6 space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Info size={14} />
          Prices include insurance for items up to ₦50,000
        </div>
        <button
          onClick={onConfirm}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black rounded-2xl shadow-xl transition-all active:scale-95"
        >
          Request {selected}
        </button>
      </div>
    </div>
  );
}