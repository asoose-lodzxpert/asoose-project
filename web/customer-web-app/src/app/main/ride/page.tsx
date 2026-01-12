'use client';

import { useEffect } from 'react';
import { Package, ChevronRight, Box, Layers, Truck, Info, Home, Briefcase } from 'lucide-react';
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { useDeliveryStore } from '../store/useDeliveryStore';
import LocationAutocomplete from './components/LocationAutocomplete';
import BottomNav from '../components/layout/BottomNav';

export default function SendPackage() {
  const { isLoaded } = useGoogleMaps();
  const { 
    packageInfo, 
    setPackageInfo, 
    setLocations, 
    pickupPos, 
    dropoffPos, 
    setStage, 
    stage 
  } = useDeliveryStore();

  const packageSizes = [
    { id: 'Small', label: 'Small', desc: 'Documents, Envelopes', icon: Package, price: 500, type: 'Document' },
    { id: 'Medium', label: 'Medium', desc: 'Shoe box, parcels', icon: Box, price: 1000, type: 'Parcel' },
    { id: 'Large', label: 'Large', desc: 'Multiple bags', icon: Layers, price: 2500, type: 'Bulk' },
    { id: 'XL', label: 'Extra Large', desc: 'Furniture, Heavy', icon: Truck, price: 5000, type: 'Heavy' },
  ];

  useEffect(() => {
    if (stage === 'IDLE') setStage('CONFIGURING');
  }, [stage, setStage]);

  const handlePickupSelect = (data: { address: string; lat: number; lng: number }) => {
    setLocations({ lat: data.lat, lng: data.lng }, undefined);
  };

  const handleDropoffSelect = (data: { address: string; lat: number; lng: number }) => {
    setLocations(undefined, { lat: data.lat, lng: data.lng });
  };

  const selectedPackage = packageSizes.find(s => s.type === packageInfo.type) || packageSizes[0];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <main className="max-w-6xl mx-auto px-6 py-10 pb-32 md:pb-20">
        <header className="mb-10 text-center lg:text-left">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Send a Package</h1>
          <p className="text-gray-500 dark:text-zinc-400 font-medium mt-1">Reliable courier delivery tailored to your needs</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Route & Instructions */}
          <div className="lg:col-span-7 space-y-10">
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Route Details</h2>
              <div className="relative space-y-4">
                {/* Visual Connector */}
                <div className="absolute left-[26px] top-10 bottom-10 w-0.5 border-l-2 border-dashed border-gray-200 dark:border-zinc-800 z-0" />
                
                {/* Pickup Autocomplete - HIGHER Z-INDEX TO PREVENT OVERLAP */}
                <div className="relative z-[50] bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Pickup From</label>
                  <LocationAutocomplete 
                    onSelect={handlePickupSelect} 
                    showPinpoint={true} 
                    placeholder="Where are we picking up?"
                  />
                </div>

                {/* Delivery Autocomplete - LOWER Z-INDEX */}
                <div className="relative z-[40] bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Deliver To</label>
                  <LocationAutocomplete 
                    onSelect={handleDropoffSelect} 
                    showPinpoint={false} // Pinpoint removed for delivery
                    placeholder="Where is the destination?"
                  />
                  <div className="flex gap-2 mt-4">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors">
                      <Home size={14} /> Home
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors">
                      <Briefcase size={14} /> Work
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Delivery Instructions</h2>
              <textarea 
                className="w-full bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border border-gray-100 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-yellow-500/20 min-h-[120px] resize-none"
                placeholder="Gate code, floor number, etc..."
                value={packageInfo.instructions}
                onChange={(e) => setPackageInfo({ instructions: e.target.value })}
              />
            </section>
          </div>

          {/* Right Column: Package Size & Summary */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-zinc-200">Package Size</h2>
              <div className="grid grid-cols-2 gap-3">
                {packageSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setPackageInfo({ type: size.type })}
                    className={`p-4 rounded-3xl border-2 text-center transition-all flex flex-col items-center gap-3 ${
                      packageInfo.type === size.type 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-transparent bg-gray-50 dark:bg-zinc-900/50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                      packageInfo.type === size.type ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : 'bg-white dark:bg-zinc-800 text-gray-400'
                    }`}>
                      <size.icon size={24} />
                    </div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{size.label}</p>
                  </button>
                ))}
              </div>
            </section>

            <div className="p-6 bg-gray-50 dark:bg-zinc-900/50 border dark:border-zinc-800 rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-500">Estimated Base Fare</span>
                <span className="dark:text-white text-lg">₦{selectedPackage.price.toLocaleString()}</span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-zinc-800" />
              <button 
                onClick={() => setStage('SELECTING_VEHICLE')}
                disabled={!pickupPos || !dropoffPos}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-200 dark:disabled:bg-zinc-800 text-white font-black py-4 px-8 rounded-2xl transition-all shadow-xl shadow-yellow-500/10 dark:shadow-none flex items-center justify-center gap-2 active:scale-95"
              >
                {!pickupPos || !dropoffPos ? 'Set Route to Continue' : 'Calculate Final Price'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}