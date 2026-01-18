'use client';

import { useEffect, useState } from 'react';
import { 
  Package, ChevronRight, Box, Layers, Truck, 
  Home, Briefcase, Loader2, CheckCircle2, 
  Star, AlertTriangle, Terminal, User, Phone
} from 'lucide-react';
import { toast } from 'react-toastify';
import BottomNav from '../components/layout/BottomNav';
import { useDeliveryStore } from '../store/useDeliveryStore';
import LocationAutocomplete from '../ride/components/LocationAutocomplete';
import DeliverySelector from './components/DeliverySelector';
import DeliveryProgressUI from './components/DeliveryProgressUi';
import { ReviewModal } from '@/store/ReviewModal';
import { createClient } from '../../../../utils/supabase/client';

export default function DeliveryPage() {
  const { 
    packageInfo, setPackageInfo, setLocations, 
    pickupPos, dropoffPos, setStage, stage, 
    courierInfo, activeDeliveryId, resetDelivery 
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const supabase = createClient();

  const packageSizes = [
    { id: 'Small', label: 'Small', icon: Package, price: 500, type: 'Document', radius: 'rounded-lg' },
    { id: 'Medium', label: 'Medium', icon: Box, price: 1000, type: 'Parcel', radius: 'rounded-xl' },
    { id: 'Large', label: 'Large', icon: Layers, price: 2500, type: 'Bulk', radius: 'rounded-2xl' },
    { id: 'XL', label: 'Extra Large', icon: Truck, price: 5000, type: 'Heavy', radius: 'rounded-3xl' },
  ];

  const handleReviewSubmit = async (rating: number, comment: string, orderId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please sign in to leave a review");

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/marketplace/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          rating, 
          comment: comment.trim(),
          orderId: orderId || activeDeliveryId,
          type: 'DELIVERY' 
        })
      });

      if (!res.ok) throw new Error('Failed to submit review');
      toast.success("Thank you for your feedback!");
    } catch (err: any) {
      toast.error(err.message);
      throw err; 
    }
  };

  useEffect(() => {
    if (stage === 'IDLE') setStage('CONFIGURING');
  }, [stage, setStage]);

  const renderStageContent = () => {
    switch (stage) {
      case 'SELECTING_VEHICLE':
        return <DeliverySelector onConfirm={() => setStage('FINDING_COURIER')} />;

      case 'FINDING_COURIER':
        return (
          <div className="max-w-md mx-auto py-24 text-center space-y-8 animate-in fade-in zoom-in-95">
            <div className="relative flex justify-center">
              <div className="absolute inset-0 bg-yellow-500/10 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-white dark:bg-zinc-900 border border-yellow-500 flex items-center justify-center rounded-full text-yellow-500 shadow-xl">
                <Loader2 size={32} className="animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Searching Network</h2>
              <p className="text-zinc-500 text-sm">Assigning closest courier node</p>
            </div>
          </div>
        );

      case 'COURIER_ASSIGNED':
      case 'PICKED_UP':
        return <DeliveryProgressUI stage={stage} courier={courierInfo} />;

      case 'COMPLETED':
        return (
          <div className="max-w-md mx-auto py-16 text-center space-y-12 animate-in fade-in duration-700">
            <div className="space-y-4 text-center">
              <div className="w-px h-12 bg-green-500 mx-auto animate-pulse mb-6" />
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Delivery <span className="text-yellow-500">Secured</span>
              </h2>
              <p className="text-zinc-500">Package successfully transferred</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setIsReviewModalOpen(true)} 
                className="flex items-center justify-between group p-6 border border-zinc-200 dark:border-zinc-800 hover:border-yellow-500/50 rounded-xl transition-all"
              >
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-yellow-500">
                  Rate Experience
                </span>
                <Star size={16} className="text-zinc-400 dark:text-zinc-600 group-hover:text-yellow-500 group-hover:fill-yellow-500 transition-all" />
              </button>
              <button 
                onClick={resetDelivery} 
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 font-medium hover:bg-yellow-500 dark:hover:bg-yellow-500 transition-colors rounded-xl"
              >
                New Dispatch
              </button>
            </div>
          </div>
        );

      default: // CONFIGURING
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
            <div className="lg:col-span-7 space-y-12">
              <section>
                <SectionHeader number="01" title="Logistics Path" />
                <div className="relative space-y-8 mt-10">
                  <div className="absolute left-[18px] top-6 bottom-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                  
                  <div className="relative pl-12 group">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center z-10 transition-colors group-focus-within:border-yellow-500">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    </div>
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 focus-within:border-yellow-500 transition-colors">
                      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 block">Origin</label>
                      <LocationAutocomplete 
                        onSelect={(data) => setLocations({ lat: data.lat, lng: data.lng }, undefined)} 
                        placeholder="Current package location"
                      />
                    </div>
                  </div>

                  <div className="relative pl-12 group">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center z-10 transition-colors group-focus-within:border-yellow-500">
                      <div className="w-1.5 h-1.5 border border-yellow-500 rounded-full" />
                    </div>
                    <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 focus-within:border-yellow-500 transition-colors">
                      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 block">Target Destination</label>
                      <input 
                        type="text"
                        placeholder="Enter full delivery address"
                        className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                        onChange={(e) => setPackageInfo({ destinationAddress: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader number="02" title="Transfer Manifest" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                  <DetailInput 
                    label="Recipient Name" 
                    icon={User} 
                    placeholder="Full legal name" 
                    value={packageInfo.recipientName}
                    onChange={(v: string) => setPackageInfo({ recipientName: v })}
                  />
                  <DetailInput 
                    label="Contact Number" 
                    icon={Phone} 
                    placeholder="+234..." 
                    value={packageInfo.recipientPhone}
                    onChange={(v: string) => setPackageInfo({ recipientPhone: v })}
                  />
                </div>
              </section>
            </div>

            <div className="lg:col-span-5 space-y-12">
              <section>
                <SectionHeader number="03" title="Cargo Dimension" />
                <div className="grid grid-cols-2 gap-4 mt-10">
                  {packageSizes.map((size) => (
                    <button 
                      key={size.id} 
                      onClick={() => setPackageInfo({ type: size.type })} 
                      className={`p-6 border transition-all duration-500 text-left flex flex-col gap-4 ${size.radius} ${
                        packageInfo.type === size.type 
                          ? 'border-yellow-500 bg-yellow-500/5' 
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <size.icon className={`w-6 h-6 ${packageInfo.type === size.type ? 'text-yellow-500' : 'text-zinc-400 dark:text-zinc-600'}`} />
                      <div>
                        <p className="text-base font-medium text-zinc-900 dark:text-white">{size.label}</p>
                        <p className="text-sm text-zinc-500">₦{size.price.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setStage('SELECTING_VEHICLE')} 
                  disabled={!pickupPos || !packageInfo.recipientName || !packageInfo.recipientPhone} 
                  className="w-full group bg-zinc-900 dark:bg-white hover:bg-yellow-500 dark:hover:bg-yellow-500 text-white dark:text-black py-4 px-6 flex items-center justify-between transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                >
                  <span className="font-medium">Initialize Dispatch</span>
                  <ChevronRight size={20} className="transition-transform group-hover:translate-x-2" />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white transition-colors duration-500">
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-32">
        <header className="mb-16 flex justify-between items-start">
          <div className="space-y-2 text-left">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
              Send a Package
            </h1>
          </div>
          <button 
            onClick={() => setShowDevTools(!showDevTools)} 
            className="text-zinc-400 dark:text-zinc-500 hover:text-yellow-500 transition-colors p-2"
          >
            <Terminal size={20} />
          </button>
        </header>

        {renderStageContent()}

        {showDevTools && <DevTools stage={stage} setStage={setStage} />}
      </main>
      
      <BottomNav />
      <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} onSubmit={handleReviewSubmit} />
    </div>
  );
}

// --- Reusable Themed Components ---

const SectionHeader = ({ number, title }: { number: string; title: string }) => (
  <div className="flex items-center gap-4">
    <span className="text-sm font-medium text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
      {number}
    </span>
    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
      {title}
    </h2>
  </div>
);

const DetailInput = ({ label, icon: Icon, placeholder, value, onChange }: any) => (
  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2 focus-within:border-yellow-500 transition-colors">
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
      <Icon size={16} className="text-yellow-500/50" /> {label}
    </label>
    <input 
      type="text"
      placeholder={placeholder}
      className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const DevTools = ({ stage, setStage }: any) => (
  <div className="fixed bottom-28 right-8 z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl w-56 shadow-2xl backdrop-blur-xl transition-all">
    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">System Override</p>
    <div className="flex flex-col gap-2">
      {['CONFIGURING', 'SELECTING_VEHICLE', 'FINDING_COURIER', 'COURIER_ASSIGNED', 'COMPLETED'].map((s) => (
        <button 
          key={s} 
          onClick={() => setStage(s as any)} 
          className={`text-sm font-medium py-2 rounded transition-colors ${
            stage === s 
              ? 'bg-yellow-500 text-black' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          {s.replace('_', ' ')}
        </button>
      ))}
    </div>
  </div>
);