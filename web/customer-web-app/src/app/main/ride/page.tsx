'use client';

import { useEffect, Suspense } from 'react';
import { ChevronRight, Home, Briefcase, Package, Box, Layers, Truck } from 'lucide-react';
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { useDeliveryStore } from '../store/useDeliveryStore';
import LocationAutocomplete from './components/LocationAutocomplete';
import BottomNav from '../components/layout/BottomNav';

// 1. Move the main logic to a separate component (not default exported)
function RidePageContent() {
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
    { id: 'Small', label: 'Small', icon: Package, price: 500, type: 'Document' },
    { id: 'Medium', label: 'Medium', icon: Box, price: 1000, type: 'Parcel' },
    { id: 'Large', label: 'Large', icon: Layers, price: 2500, type: 'Bulk' },
    { id: 'XL', label: 'Extra Large', icon: Truck, price: 5000, type: 'Heavy' },
  ];

  useEffect(() => {
    if (stage === 'IDLE') setStage('CONFIGURING');
  }, [stage, setStage]);

  const selectedPackage = packageSizes.find(s => s.type === packageInfo.type) || packageSizes[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-yellow-500/30">
      {/* Background Decorative Text */}
      <div className="fixed top-20 right-[-5%] pointer-events-none select-none">
        <span className="text-[15rem] font-black text-white/[0.02] leading-none uppercase tracking-tighter">
          Logistics
        </span>
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-32">
        {/* Header Section */}
        <header className="mb-16">
          <h1 className="text-4xl font-black uppercase tracking-tighter italic italic-bold">
            Send <span className="text-yellow-500">Package</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">
            Automated Courier Dispatch System
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Track 01: Route Configuration */}
          <div className="lg:col-span-7 space-y-12">
            <section>
              <SectionHeader number="01" title="Route Configuration" />
              <div className="relative space-y-6 mt-8">
                {/* Vertical Indicator Line */}
                <div className="absolute left-[18px] top-6 bottom-6 w-px bg-zinc-800" />
                
                {/* Pickup */}
                <div className="relative pl-12">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#0a0a0a] border border-zinc-800 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  </div>
                  <div className="group border-b border-zinc-800 focus-within:border-yellow-500 transition-colors">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Source</label>
                    <LocationAutocomplete 
                      onSelect={(d) => setLocations({ lat: d.lat, lng: d.lng }, undefined)} 
                      placeholder="Enter pickup location"
                    />
                  </div>
                </div>

                {/* Dropoff */}
                <div className="relative pl-12">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#0a0a0a] border border-zinc-800 rounded-full flex items-center justify-center z-10">
                    <div className="w-2 h-2 border border-yellow-500 rounded-full" />
                  </div>
                  <div className="group border-b border-zinc-800 focus-within:border-yellow-500 transition-colors">
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Destination</label>
                    <LocationAutocomplete 
                      onSelect={(d) => setLocations(undefined, { lat: d.lat, lng: d.lng })} 
                      placeholder="Enter dropoff location"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Shortcuts */}
              <div className="flex gap-4 mt-8 ml-12">
                <ShortcutButton icon={Home} label="Home" />
                <ShortcutButton icon={Briefcase} label="Office" />
              </div>
            </section>

            <section>
              <SectionHeader number="02" title="Handling Notes" />
              <textarea 
                className="w-full bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl text-sm outline-none focus:border-yellow-500/50 transition-all min-h-[140px] mt-6 placeholder:text-zinc-700 font-medium"
                placeholder="Fragile items, gate instructions, or recipient phone..."
                value={packageInfo.instructions}
                onChange={(e) => setPackageInfo({ instructions: e.target.value })}
              />
            </section>
          </div>

          {/* Track 02: Dimension & Payload */}
          <div className="lg:col-span-5 space-y-12">
            <section>
              <SectionHeader number="03" title="Payload Size" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                {packageSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setPackageInfo({ type: size.type })}
                    className={`p-6 border transition-all duration-300 group flex flex-col gap-4 text-left ${
                      packageInfo.type === size.type 
                      ? 'border-yellow-500 bg-yellow-500/5' 
                      : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
                    }`}
                  >
                    <size.icon className={`w-5 h-5 ${packageInfo.type === size.type ? 'text-yellow-500' : 'text-zinc-600'}`} />
                    <div>
                      <p className="font-black uppercase text-[10px] tracking-widest text-zinc-500 mb-1">Format</p>
                      <p className="font-bold text-sm text-white">{size.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Footer Summary */}
            <div className="pt-8 border-t border-zinc-800">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Estimated Fare</p>
                  <p className="text-3xl font-black tracking-tighter italic">
                    ₦{selectedPackage.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setStage('SELECTING_VEHICLE')}
                disabled={!pickupPos || !dropoffPos}
                className="w-full group bg-white hover:bg-yellow-500 text-black py-5 px-8 flex items-center justify-between transition-all duration-500 disabled:opacity-10 disabled:grayscale"
              >
                <span className="font-black uppercase text-xs tracking-[0.3em]">Initialize Dispatch</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

// 2. Export the component wrapped in Suspense
export default function SendPackage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-zinc-900 rounded"></div>
        </div>
      </div>
    }>
      <RidePageContent />
    </Suspense>
  );
}

// Minimalist Sub-components
const SectionHeader = ({ number, title }: { number: string; title: string }) => (
  <div className="flex items-center gap-4">
    <span className="text-[10px] font-black text-yellow-500 font-mono tracking-widest bg-yellow-500/10 px-2 py-1 rounded">
      {number}
    </span>
    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">
      {title}
    </h2>
  </div>
);

const ShortcutButton = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
    <Icon size={12} className="text-yellow-500" /> {label}
  </button>
);