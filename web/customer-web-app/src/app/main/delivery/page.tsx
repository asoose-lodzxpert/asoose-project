'use client';

import { useEffect, useState } from 'react';
import { 
  Package, ChevronRight, Box, Layers, Truck, 
  Home, Briefcase, Loader2, CheckCircle2, 
  Star, AlertTriangle, ArrowLeft, Terminal 
} from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import { useDeliveryStore } from '../store/useDeliveryStore';
import LocationAutocomplete from '../ride/components/LocationAutocomplete';
import DeliverySelector from './components/DeliverySelector';
import DeliveryProgressUI from './components/DeliveryProgressUi';
import {ReviewModal} from '@/store/ReviewModal';


export default function DeliveryPage() {
  const { 
    packageInfo, setPackageInfo, setLocations, 
    pickupPos, dropoffPos, setStage, stage, 
    courierInfo, activeDeliveryId, resetDelivery 
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  const packageSizes = [
    { id: 'Small', label: 'Small', desc: 'Documents, Envelopes', icon: Package, price: 500, type: 'Document' },
    { id: 'Medium', label: 'Medium', desc: 'Shoe box, parcels', icon: Box, price: 1000, type: 'Parcel' },
    { id: 'Large', label: 'Large', desc: 'Multiple bags', icon: Layers, price: 2500, type: 'Bulk' },
    { id: 'XL', label: 'Extra Large', desc: 'Furniture, Heavy', icon: Truck, price: 5000, type: 'Heavy' },
  ];

  // 1. Initial State Setup
  useEffect(() => {
    if (stage === 'IDLE') setStage('CONFIGURING');
  }, [stage, setStage]);

  // 2. Automated Mock Transitions
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (stage === 'FINDING_COURIER') {
      // Simulate finding a courier after 3 seconds
      timer = setTimeout(() => {
        // Set mock courier data into the store manually for the simulation
        useDeliveryStore.setState({
          courierInfo: {
            name: 'Kelvin',
            vehicle: 'Yamaha Bike • LAG-442',
            phone: '+234 800 000 0000'
          }
        });
        setStage('COURIER_ASSIGNED');
      }, 3000);
    }

    return () => clearTimeout(timer);
  }, [stage, setStage]);

  const renderStageContent = () => {
    switch (stage) {
      case 'SELECTING_VEHICLE':
        return (
          <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b dark:border-zinc-800 flex items-center gap-3">
              <button onClick={() => setStage('CONFIGURING')} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
                <ArrowLeft size={20} />
              </button>
              <span className="font-bold dark:text-white">Select Vehicle Type</span>
            </div>
            <DeliverySelector onConfirm={() => setStage('FINDING_COURIER')} />
          </div>
        );

      case 'FINDING_COURIER':
        return (
          <div className="max-w-md mx-auto py-20 text-center space-y-6">
            <div className="relative flex justify-center">
              <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-ping" />
              <div className="relative bg-yellow-500 p-8 rounded-full text-white">
                <Loader2 size={40} className="animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black dark:text-white">Finding a courier...</h2>
              <p className="text-gray-500">Matching you with the nearest delivery partner</p>
            </div>
          </div>
        );

      case 'COURIER_ASSIGNED':
      case 'PICKED_UP':
        return (
          <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 shadow-2xl overflow-hidden">
            <DeliveryProgressUI stage={stage} courier={courierInfo} />
          </div>
        );

      case 'COMPLETED':
        return (
          <div className="max-w-md mx-auto py-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-green-100 dark:bg-green-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black dark:text-white">Package Delivered!</h2>
              <p className="text-gray-500 dark:text-zinc-400 font-medium">Your experience matters to us.</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => setIsReviewModalOpen(true)} className="flex items-center justify-center gap-3 w-full p-4 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-500/20 rounded-2xl text-yellow-700 dark:text-yellow-500 font-bold hover:bg-yellow-100 transition-colors">
                <Star size={20} className="fill-current" /> Rate Courier
              </button>
              <button onClick={() => window.location.href = `/main/disputes/new?id=${activeDeliveryId}`} className="flex items-center justify-center gap-3 w-full p-4 bg-red-50 dark:bg-red-900/10 border-2 border-red-500/20 rounded-2xl text-red-700 dark:text-red-500 font-bold hover:bg-red-100 transition-colors">
                <AlertTriangle size={20} /> Report Dispute
              </button>
            </div>
            <button onClick={resetDelivery} className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl">
              Send Another Package
            </button>
          </div>
        );

      default: // CONFIGURING
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7 space-y-10">
              <section className="space-y-4">
                <h2 className="text-lg font-bold dark:text-white">Route Details</h2>
                <div className="relative space-y-4">
                  <div className="absolute left-[26px] top-10 bottom-10 w-0.5 border-l-2 border-dashed border-gray-200 dark:border-zinc-800 z-0" />
                  <div className="relative z-50 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border dark:border-zinc-800">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pickup</label>
                    <LocationAutocomplete 
                      onSelect={(data) => setLocations({ lat: data.lat, lng: data.lng }, undefined)} 
                      placeholder="Pickup point"
                      showPinpoint={true}
                    />
                  </div>
                  <div className="relative z-40 bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border dark:border-zinc-800">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery</label>
                    <LocationAutocomplete 
                      onSelect={(data) => setLocations(undefined, { lat: data.lat, lng: data.lng })} 
                      placeholder="Destination"
                    />
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <h2 className="text-lg font-bold dark:text-white">Instructions</h2>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-zinc-900/50 p-5 rounded-3xl border dark:border-zinc-800 text-sm outline-none min-h-[120px] dark:text-white"
                  placeholder="Notes for courier..."
                  value={packageInfo.instructions}
                  onChange={(e) => setPackageInfo({ instructions: e.target.value })}
                />
              </section>
            </div>
            <div className="lg:col-span-5 space-y-8">
              <section className="space-y-4">
                <h2 className="text-lg font-bold dark:text-white">Size</h2>
                <div className="grid grid-cols-2 gap-3">
                  {packageSizes.map((size) => (
                    <button key={size.id} onClick={() => setPackageInfo({ type: size.type })} className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${packageInfo.type === size.type ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-transparent bg-gray-50 dark:bg-zinc-900/50'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${packageInfo.type === size.type ? 'bg-yellow-500 text-white' : 'bg-white dark:bg-zinc-800 text-gray-400'}`}><size.icon size={24} /></div>
                      <p className="font-bold text-sm dark:text-white">{size.label}</p>
                    </button>
                  ))}
                </div>
              </section>
              <button onClick={() => setStage('SELECTING_VEHICLE')} disabled={!pickupPos || !dropoffPos} className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-200 text-white font-black py-4 rounded-2xl">
                Continue to Selection <ChevronRight size={18} className="inline ml-2" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      <main className="max-w-6xl mx-auto px-6 py-10 pb-32">
        <header className="mb-10 flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight dark:text-white">Send a Package</h1>
          {/* 3. Dev Tools Trigger */}
          <button 
            onClick={() => setShowDevTools(!showDevTools)}
            className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full text-gray-400 hover:text-yellow-500 transition-colors"
          >
            <Terminal size={20} />
          </button>
        </header>

        {renderStageContent()}

        {/* 4. Dev Tools Overlay */}
        {showDevTools && (
          <div className="fixed bottom-24 right-6 z-[9999] bg-black/90 p-4 rounded-2xl border border-white/10 shadow-2xl w-48">
            <p className="text-[10px] text-white/40 font-black uppercase mb-3 tracking-widest">Mock Stage Controller</p>
            <div className="grid grid-cols-1 gap-2">
              {['CONFIGURING', 'SELECTING_VEHICLE', 'FINDING_COURIER', 'COURIER_ASSIGNED', 'PICKED_UP', 'COMPLETED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s as any)}
                  className={`text-[10px] font-bold py-2 rounded-lg transition-colors ${stage === s ? 'bg-yellow-500 text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} orderId={activeDeliveryId || ''} />
    </div>
  );
}