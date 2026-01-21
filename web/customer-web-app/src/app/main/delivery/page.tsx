'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Package, ChevronRight, Box, Layers, Truck, 
  Loader2, Star, Terminal, User, Phone, MapPin
} from 'lucide-react';
import { toast } from 'react-toastify';
import BottomNav from '../components/layout/BottomNav';
import { useDeliveryStore } from '../store/useDeliveryStore';
import LocationAutocomplete from '../ride/components/LocationAutocomplete';
import DeliverySelector from './components/DeliverySelector';
import DeliveryProgressUI from './components/DeliveryProgressUi';
import { ReviewModal } from '@/store/ReviewModal';
import { createClient } from '../../../../utils/supabase/client';
import { paymentService } from '@/services/payment.service';
import { PAYMENT_METHODS } from '../ride/constants/config';
import { api } from '@/services/api';

export default function DeliveryPage() {
  const { 
    packageInfo, setPackageInfo, setLocations, 
    pickupPos, dropoffPos, setStage, stage, 
    courierInfo, activeDeliveryId, resetDelivery 
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);
  const supabase = createClient();

  // Validate that we have Coordinates AND Address strings
  const isFormValid = useMemo(() => {
    return (
      pickupPos && 
      dropoffPos && 
      packageInfo.pickupAddress &&
      packageInfo.destinationAddress &&
      packageInfo.recipientName && 
      packageInfo.recipientPhone
    );
  }, [pickupPos, dropoffPos, packageInfo]);

  const packageSizes = [
    { id: 'Small', label: 'Small', icon: Package, price: 500, type: 'Document', radius: 'rounded-lg' },
    { id: 'Medium', label: 'Medium', icon: Box, price: 1000, type: 'Parcel', radius: 'rounded-xl' },
    { id: 'Large', label: 'Large', icon: Layers, price: 2500, type: 'Bulk', radius: 'rounded-2xl' },
    { id: 'XL', label: 'Extra Large', icon: Truck, price: 5000, type: 'Heavy', radius: 'rounded-3xl' },
  ];

  const handleReviewSubmit = async (rating: number, comment: string, orderId?: string) => {
    // ... existing review logic ...
  };



const handleDeliveryRequest = async () => {
    // Assuming 'selectedVehicle' logic exists or is part of state
    // We default to Paystack/Card for deliveries for MVP unless specified otherwise
    const gateway = 'PAYSTACK'; 
    
    try {
        setStage('FINDING_COURIER'); // Show loading state

        const { data: { session } } = await supabase.auth.getSession();
        
        // 1. Create Delivery Order
        // Note: Using a specific endpoint for delivery creation or generic orders
        const orderRes = await api.post('/users/orders', {
            type: 'DELIVERY', // Assuming backend distinguishes via type or separate endpoint
            pickup: { ...pickupPos, address: packageInfo.pickupAddress },
            dropoff: { ...dropoffPos, address: packageInfo.destinationAddress },
            recipient: {
                name: packageInfo.recipientName,
                phone: packageInfo.recipientPhone
            },
            packageDetails: packageInfo,
            // Calculate price based on logic or backend estimate
            amount: 2500 // Replace with real calculation
        });

        const orderData = orderRes.data;

        // 2. Initiate Payment
        localStorage.setItem('pending_delivery', 'true');
        
        const paymentRes = await paymentService.initiatePayment({
            amount: 2500, // Replace with dynamic amount
            email: session?.user.email || '',
            gateway: gateway,
            method: 'CARD',
            type: 'ORDER', // Delivery is technically an order in payment system
            orderId: orderData.id
        });

        if (paymentRes.authorizationUrl) {
            window.location.href = paymentRes.authorizationUrl;
        }

    } catch (error: any) {
        toast.error("Failed to initialize delivery");
        setStage('CONFIGURING');
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
               <Loader2 size={48} className="animate-spin text-yellow-500" />
             </div>
             <p className="text-zinc-500 dark:text-zinc-400">Connecting to courier network...</p>
          </div>
        );

      case 'COURIER_ASSIGNED':
      case 'PICKED_UP':
        return <DeliveryProgressUI stage={stage} courier={courierInfo} />;

      case 'COMPLETED':
        return (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold dark:text-white">Delivery Completed</h2>
              <button onClick={resetDelivery} className="mt-8 bg-zinc-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl">Start New</button>
            </div>
        );

      default: // CONFIGURING
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
            <div className="lg:col-span-7 space-y-12">
              <section>
                <SectionHeader number="01" title="Logistics Path" />
                <div className="relative space-y-8 mt-10">
                  {/* Connector Line */}
                  <div className="absolute left-[18px] top-6 bottom-6 w-px bg-zinc-200 dark:bg-white/10" />
                  
                  {/* Origin Field */}
                  <div className="relative pl-12 group">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-full flex items-center justify-center z-10 transition-colors group-focus-within:border-yellow-500">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                    </div>
                    <div className="border-b border-zinc-200 dark:border-white/10 pb-2 focus-within:border-yellow-500 transition-colors">
                      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 block">Origin</label>
                      <LocationAutocomplete 
                        placeholder="Current package location"
                        initialValue={packageInfo.pickupAddress}
                        onSelect={(data) => {
                          setLocations({ lat: data.lat, lng: data.lng }, undefined);
                          setPackageInfo({ pickupAddress: data.address });
                        }}
                      />
                    </div>
                  </div>

                  {/* Destination Field (Now using Autocomplete) */}
                  <div className="relative pl-12 group">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 rounded-full flex items-center justify-center z-10 transition-colors group-focus-within:border-yellow-500">
                      <div className="w-1.5 h-1.5 border border-yellow-500 rounded-full" />
                    </div>
                    <div className="border-b border-zinc-200 dark:border-white/10 pb-2 focus-within:border-yellow-500 transition-colors">
                      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 block">Target Destination</label>
                      <LocationAutocomplete 
                        placeholder="Enter full delivery address"
                        initialValue={packageInfo.destinationAddress}
                        showPinpoint={false}
                        onSelect={(data) => {
                          setLocations(undefined, { lat: data.lat, lng: data.lng });
                          setPackageInfo({ destinationAddress: data.address });
                        }}
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
                          : 'border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:border-zinc-300 dark:hover:border-white/20'
                      }`}
                    >
                      <size.icon className={`w-6 h-6 ${packageInfo.type === size.type ? 'text-yellow-500' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <div>
                        <p className="text-base font-medium text-zinc-900 dark:text-white">{size.label}</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">₦{size.price.toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-200 dark:border-white/10">
                <button 
                  onClick={() => setStage('SELECTING_VEHICLE')} 
                  disabled={!isFormValid} 
                  className="w-full group bg-zinc-900 dark:bg-white hover:bg-yellow-500 dark:hover:bg-yellow-500 text-white dark:text-black py-4 px-6 flex items-center justify-between transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                >
                  <span className="font-medium">
                    {isFormValid ? "Initialize Dispatch" : "Complete Logistics Data"}
                  </span>
                  <ChevronRight size={20} className="transition-transform group-hover:translate-x-2" />
                </button>
                {!isFormValid && (
                  <p className="text-center text-xs text-red-500 mt-2 font-medium animate-pulse">
                    * Origin, destination, and recipient details required
                  </p>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-white transition-colors duration-500">
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

// Reuse existing helper components (SectionHeader, DetailInput, DevTools)
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
  <div className="border-b border-zinc-200 dark:border-white/10 pb-2 focus-within:border-yellow-500 transition-colors">
    <label className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
      <Icon size={16} className="text-yellow-500/50" /> {label}
    </label>
    <input 
      type="text"
      placeholder={placeholder}
      className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

const DevTools = ({ stage, setStage }: any) => (
  <div className="fixed bottom-28 right-8 z-[100] bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-white/10 p-6 rounded-2xl w-56 shadow-2xl backdrop-blur-xl transition-all">
    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-4">System Override</p>
    <div className="flex flex-col gap-2">
      {['CONFIGURING', 'SELECTING_VEHICLE', 'FINDING_COURIER', 'COURIER_ASSIGNED', 'COMPLETED'].map((s) => (
        <button 
          key={s} 
          onClick={() => setStage(s as any)} 
          className={`text-sm font-medium py-2 rounded transition-colors ${
            stage === s 
              ? 'bg-yellow-500 text-black' 
              : 'bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10'
          }`}
        >
          {s.replace('_', ' ')}
        </button>
      ))}
    </div>
  </div>
);