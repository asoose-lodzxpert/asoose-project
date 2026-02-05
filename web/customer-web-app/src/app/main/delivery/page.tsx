'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package, ChevronRight, Box, Layers, Truck, 
  Loader2, User, Phone, AlertCircle, RefreshCw, CreditCard, CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react';
import BottomNav from '../components/layout/BottomNav';
import { useDeliveryStore } from '@/store/useDeliveryStore';
import LocationAutocomplete from '../ride/components/LocationAutocomplete';
import DeliverySelector from './components/DeliverySelector';
import DeliveryProgressUI from './components/DeliveryProgressUi';
import { ReviewModal } from '@/store/ReviewModal';
import { paymentService } from '@/services/payment.service';
import { DeliveryService } from '@/services/delivery.service';
import { socketService } from '@/services/socket.service';


// ===========================
// CONSTANTS & TYPES
// ===========================

const DeliveryStage = {
  IDLE: 'IDLE',
  CONFIGURING: 'CONFIGURING',
  PROCESSING_ADDRESS: 'Processing_Address',
  CALCULATING_FEE: 'Calculating_Fee',
  REVIEW_PAYMENT: 'REVIEW_PAYMENT',
  SELECTING_VEHICLE: 'SELECTING_VEHICLE', // Kept for legacy support
  PAYMENT_PENDING: 'Payment_Pending',
  FINDING_COURIER: 'FINDING_COURIER',
  COURIER_ASSIGNED: 'COURIER_ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  COMPLETED: 'COMPLETED'
} as const;

const PHONE_REGEX = /^(\+234|0)[789][01]\d{8}$/;
const PENDING_DELIVERY_KEY = 'pending_delivery_data'; // Stores JSON: { id, reference }

interface DetailInputProps {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

interface SessionWithToken {
  accessToken?: string;
  user?: {
    accessToken?: string;
    email?: string;
  };
}

// ===========================
// UTILITIES
// ===========================

const getAuthToken = (session: any): string | null => {
  const typedSession = session as SessionWithToken;
  return typedSession?.accessToken || typedSession?.user?.accessToken || null;
};

const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.trim();
  if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
};

const validatePhoneNumber = (phone: string): { valid: boolean; error: string | null } => {
  if (!phone) return { valid: false, error: null };
  const normalized = normalizePhoneNumber(phone);
  if (!PHONE_REGEX.test(normalized)) {
    return { valid: false, error: "Enter valid Nigerian number (e.g. 08012345678)" };
  }
  return { valid: true, error: null };
};

const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input.trim().slice(0, maxLength);
};

// ===========================
// MAIN COMPONENT
// ===========================

export default function DeliveryPage() {
  const router = useRouter();
  const { 
    packageInfo, setPackageInfo, setLocations, 
    pickupPos, dropoffPos, setStage, stage, 
    courierInfo, activeDeliveryId, resetDelivery,
    setAddressIds, setCalculatedFee, calculatedFee
  } = useDeliveryStore();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<boolean>(false);
  const { data: session, status } = useSession();

  // Redirect if we are in a tracking state
  useEffect(() => {
    const trackingStages = [
      DeliveryStage.FINDING_COURIER, 
      DeliveryStage.COURIER_ASSIGNED, 
      DeliveryStage.PICKED_UP, 
      DeliveryStage.COMPLETED
    ];
    if (activeDeliveryId && trackingStages.includes(stage as any)) {
      router.push(`/main/delivery/${activeDeliveryId}`);
    }
  }, [stage, activeDeliveryId, router]);

  // ===========================
  // RECOVERY LOGIC (THE FIX)
  // ===========================
  const handlePaymentSuccess = useCallback((id?: string) => {
    localStorage.removeItem(PENDING_DELIVERY_KEY);
    setStage(DeliveryStage.FINDING_COURIER);
    toast.success("Payment confirmed!");
    const targetId = id || activeDeliveryId;
    if (targetId) {
      router.push(`/main/delivery/${targetId}`);
    }
  }, [activeDeliveryId, router, setStage]);

  useEffect(() => {
    const recoverState = async () => {
      // Wait for session to be ready
      if (status === 'loading') return;

      const storedData = localStorage.getItem(PENDING_DELIVERY_KEY);
      const token = getAuthToken(session);
      
      if (storedData) {
        try {
          const { id, reference } = JSON.parse(storedData);
          
          // Only attempt recovery if we are in a pending/review state and have an ID
          if (id && reference && (stage === DeliveryStage.PAYMENT_PENDING || stage === DeliveryStage.REVIEW_PAYMENT)) {
             
             // 1. Force Active Verification First
             // Pass token explicitly
             const isVerified = await DeliveryService.verifyPayment(reference, token || undefined);
             
             if (isVerified) {
               handlePaymentSuccess(id);
               return;
             }

             // 2. If verification failed (network/timing), fall back to Polling
             // We restore the ID to the store to ensure the UI Context is correct
             useDeliveryStore.setState({ activeDeliveryId: id });
             setStage(DeliveryStage.PAYMENT_PENDING); 
             
             // Start polling as fallback
             // Pass token explicitly
             const success = await DeliveryService.pollDeliveryStatus(id, undefined, undefined, undefined, token || undefined);
             if (success) {
               handlePaymentSuccess(id);
             }
          }
        } catch (e) {
          console.error("Failed to parse pending delivery data", e);
          localStorage.removeItem(PENDING_DELIVERY_KEY);
        }
      }
    };

    recoverState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]); // Added session dependencies

  // ===========================
  // EVENT HANDLERS
  // ===========================

  const handleSocketUpdate = useCallback((data: any) => {
    if (data.status === 'ASSIGNED') {
      useDeliveryStore.setState({ courierInfo: data.rider, stage: DeliveryStage.COURIER_ASSIGNED });
      toast.info("Courier found! They are on their way.");
    } else if (data.status === 'PICKED_UP') {
      setStage(DeliveryStage.PICKED_UP);
    } else if (data.status === 'DELIVERED' || data.status === 'COMPLETED') {
      setStage(DeliveryStage.COMPLETED);
    }
  }, [setStage]);

  // Connect Socket
  useEffect(() => {
    const token = getAuthToken(session);
    if (token && activeDeliveryId) {
      socketService.connect(token);
      socketService.on('delivery_update', (data) => {
        if (data.deliveryId === activeDeliveryId) handleSocketUpdate(data);
      });
      return () => { socketService.off('delivery_update', handleSocketUpdate); };
    }
  }, [activeDeliveryId, session, handleSocketUpdate]);

  const handlePhoneChange = useCallback((value: string) => {
    setPackageInfo({ recipientPhone: value });
    const validation = validatePhoneNumber(value);
    setPhoneError(validation.error);
  }, [setPackageInfo]);

  const isFormValid = useMemo(() => {
    return Boolean(
      pickupPos && dropoffPos && packageInfo.recipientName && 
      packageInfo.recipientPhone && !phoneError &&
      validatePhoneNumber(packageInfo.recipientPhone).valid
    );
  }, [pickupPos, dropoffPos, packageInfo, phoneError]);

  const packageSizes = [
    { id: 'Small', label: 'Small', icon: Package, type: 'Document', radius: 'rounded-lg', weightLabel: '< 5 kg', weightValue: 2.5 },
    { id: 'Medium', label: 'Medium', icon: Box, type: 'Parcel', radius: 'rounded-xl', weightLabel: '5-20 kg', weightValue: 12.5 },
    { id: 'Large', label: 'Large', icon: Layers, type: 'Bulk', radius: 'rounded-2xl', weightLabel: '20-50 kg', weightValue: 35 },
    { id: 'XL', label: 'Extra Large', icon: Truck, type: 'Heavy', radius: 'rounded-3xl', weightLabel: '50+ kg', weightValue: 60 },
  ];

  const getSelectedWeight = (): number => {
    const selected = packageSizes.find(p => p.type === packageInfo.type);
    return selected ? selected.weightValue : 2.5;
  };

  const handleInitializeDelivery = async () => {
    if (!pickupPos || !dropoffPos) return;

    // ✅ FIX: Retrieve token from session
    const token = getAuthToken(session);
    if (!token) {
      toast.error("Please log in to continue");
      // Optional: redirect to login
      // router.push('/sign-in'); 
      return;
    }

    setApiError(false);
    
    try {
      setStage(DeliveryStage.PROCESSING_ADDRESS);
      const cityFallback = "Lagos";

      // ✅ FIX: Pass token to saveAddress
      const pickupRes = await DeliveryService.saveAddress({
        street: sanitizeInput(packageInfo.pickupAddress),
        city: cityFallback,
        lat: pickupPos.lat,
        lng: pickupPos.lng
      }, token);

      // ✅ FIX: Pass token to saveAddress
      const dropoffRes = await DeliveryService.saveAddress({
        street: sanitizeInput(packageInfo.destinationAddress),
        city: cityFallback,
        lat: dropoffPos.lat,
        lng: dropoffPos.lng
      }, token);

      setAddressIds(pickupRes.id, dropoffRes.id);
      setStage(DeliveryStage.CALCULATING_FEE);
      
      // ✅ FIX: Pass token to createDelivery
      const deliveryRes = await DeliveryService.createDelivery({
        pickupAddressId: pickupRes.id,
        dropoffAddressId: dropoffRes.id,
        recipientName: sanitizeInput(packageInfo.recipientName),
        recipientPhone: normalizePhoneNumber(packageInfo.recipientPhone),
        packageDetails: sanitizeInput(`${packageInfo.type} - ${packageInfo.instructions || ''}`),
        weightKg: getSelectedWeight()
      }, token);

      if (deliveryRes?.delivery?.id) {
        useDeliveryStore.setState({ activeDeliveryId: deliveryRes.delivery.id });
        setCalculatedFee(deliveryRes.deliveryFee);
        setStage(DeliveryStage.REVIEW_PAYMENT); // Skip vehicle selection
      } else {
        throw new Error("Invalid server response");
      }
    } catch (error: any) {
      console.error("Init Error:", error);
      toast.error(error.message || "Failed to initialize delivery.");
      setApiError(true);
      setStage(DeliveryStage.CONFIGURING);
    }
  };

  const handlePayment = async () => {
    if (!activeDeliveryId || !calculatedFee) return;
    const token = getAuthToken(session);
    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      setStage(DeliveryStage.PAYMENT_PENDING);
      const userEmail = session?.user?.email || `guest-${Date.now()}@asoose.com`;

      const paymentRes = await paymentService.initiatePayment({
        amount: calculatedFee, 
        email: userEmail,
        gateway: 'PAYSTACK', 
        method: 'CARD', 
        type: 'DELIVERY', 
        metadata: { deliveryId: activeDeliveryId, purpose: 'DELIVERY_REQUEST' }
      }, token);

      if (paymentRes.authorizationUrl && paymentRes.reference) {
        // ✅ FIX: Store Reference + ID
        localStorage.setItem(PENDING_DELIVERY_KEY, JSON.stringify({
          id: activeDeliveryId,
          reference: paymentRes.reference
        }));
        window.location.href = paymentRes.authorizationUrl;
      } else {
        throw new Error("Invalid payment response");
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast.error("Payment initialization failed");
      setStage(DeliveryStage.REVIEW_PAYMENT);
    }
  };

  const handleManualPaymentCheck = useCallback(async () => {
    if (activeDeliveryId) {
       // Attempt a manual poll when user clicks "I have paid"
       const token = getAuthToken(session);
       // Pass token
       const success = await DeliveryService.pollDeliveryStatus(
         activeDeliveryId, 
         undefined, 
         undefined, 
         undefined, 
         token || undefined
       );
       if (success) handlePaymentSuccess();
       else toast.info("Payment not yet confirmed. We are still checking...");
    }
  }, [activeDeliveryId, handlePaymentSuccess, session]);

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!activeDeliveryId) return;
    const token = getAuthToken(session);
    try {
      // Pass token
      await DeliveryService.rateDelivery(
        activeDeliveryId, 
        rating, 
        sanitizeInput(comment, 1000), 
        token || undefined
      );
      toast.success("Review submitted successfully");
      setIsReviewModalOpen(false);
    } catch (error: any) {
      console.error("Review submission error:", error);
      toast.error("Failed to submit review. Please try again.");
    }
  };

  const handleResetDelivery = useCallback(() => {
    localStorage.removeItem(PENDING_DELIVERY_KEY);
    resetDelivery();
    setStage(DeliveryStage.IDLE);
  }, [resetDelivery, setStage]);

  // ===========================
  // RENDER CONTENT
  // ===========================
  const renderStageContent = () => {
    if (apiError && stage === DeliveryStage.CONFIGURING) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100">Connection Failed</h3>
          <button onClick={handleInitializeDelivery} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium mt-4">
            <RefreshCw size={18} /> Retry
          </button>
          <button onClick={() => setApiError(false)} className="mt-4 text-sm text-gray-500 underline">Edit Details</button>
        </div>
      );
    }

    switch (stage) {
      case DeliveryStage.PROCESSING_ADDRESS:
      case DeliveryStage.CALCULATING_FEE:
        return (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={48} className="animate-spin text-yellow-500" />
            <p className="font-bold text-lg">Processing Logistics...</p>
          </div>
        );

      case DeliveryStage.REVIEW_PAYMENT:
      case DeliveryStage.SELECTING_VEHICLE: // Handle legacy state if stuck
        return (
          <div className="max-w-xl mx-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-in fade-in slide-in-from-bottom-4 shadow-xl">
             <div className="text-center mb-8">
               <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                 <CreditCard size={32} />
               </div>
               <h2 className="text-2xl font-black mb-2 dark:text-white">Review & Pay</h2>
               <p className="text-zinc-500">Total Delivery Fee</p>
             </div>

             <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl mb-6 flex justify-between items-center border border-zinc-100 dark:border-zinc-700">
                <span className="font-medium text-zinc-600 dark:text-zinc-400">Amount to Pay</span>
                <span className="text-3xl font-black dark:text-white">₦{calculatedFee?.toLocaleString()}</span>
             </div>

             <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl mb-8">
               <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
               <p className="text-sm text-blue-700 dark:text-blue-300">
                 Vehicle assigned automatically based on package weight ({packageInfo.weight}).
               </p>
             </div>

             <div className="space-y-3">
               <button onClick={handlePayment} className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                 Pay Securely <ChevronRight size={18} />
               </button>
               <button onClick={() => setStage(DeliveryStage.CONFIGURING)} className="w-full py-3 text-zinc-500 font-medium hover:text-zinc-800 transition-colors">
                 Cancel & Edit
               </button>
             </div>
          </div>
        );
        
      case DeliveryStage.PAYMENT_PENDING:
        return (
          <div className="text-center py-20">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold dark:text-white">Processing Payment</h3>
            <p className="text-sm text-gray-500 mt-2">Completing your secure transaction...</p>
            <button onClick={handleManualPaymentCheck} className="mt-6 text-sm font-medium text-blue-500 hover:underline">
              I have completed payment
            </button>
          </div>
        );

      case DeliveryStage.FINDING_COURIER:
      case DeliveryStage.COURIER_ASSIGNED:
      case DeliveryStage.PICKED_UP:
      case DeliveryStage.COMPLETED:
        return <DeliveryProgressUI stage={stage} courier={courierInfo} />;

      default: // CONFIGURING
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
            {/* Left Column: Addresses */}
            <div className="lg:col-span-7 space-y-12">
              <section>
                <div className="relative space-y-8 mt-10">
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label className="text-sm font-medium mb-2 block text-zinc-500">Pickup Location</label>
                    <LocationAutocomplete 
                      placeholder="Current package location"
                      initialValue={packageInfo.pickupAddress}
                      onSelect={(data) => {
                        setLocations({ lat: data.lat, lng: data.lng }, undefined);
                        setPackageInfo({ pickupAddress: data.address });
                      }}
                    />
                  </div>
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <label className="text-sm font-medium mb-2 block text-zinc-500">Delivery Address</label>
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
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailInput 
                    label="Recipient Name" icon={User} placeholder="Full name" 
                    value={packageInfo.recipientName}
                    onChange={(v) => setPackageInfo({ recipientName: v })}
                  />
                  <DetailInput 
                    label="Contact Number" icon={Phone} placeholder="08012345678" 
                    value={packageInfo.recipientPhone}
                    onChange={handlePhoneChange}
                    error={phoneError}
                  />
                </div>
              </section>
            </div>

            {/* Right Column: Package Size */}
            <div className="lg:col-span-5 space-y-12">
              <section>
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Package Size</h3>
                <div className="grid grid-cols-2 gap-4">
                  {packageSizes.map((size) => (
                    <button 
                      key={size.id} 
                      onClick={() => setPackageInfo({ type: size.type, weight: size.weightLabel })} 
                      className={`p-6 border transition-all duration-300 text-left flex flex-col gap-4 ${size.radius} ${
                        packageInfo.type === size.type 
                          ? 'border-yellow-500 bg-yellow-500/5 shadow-md' 
                          : 'border-zinc-200 dark:border-white/10 hover:border-yellow-500/50'
                      }`}
                    >
                      <size.icon className={`w-6 h-6 ${packageInfo.type === size.type ? 'text-yellow-500' : 'text-zinc-400'}`} />
                      <div>
                        <p className="text-base font-medium dark:text-white">{size.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{size.weightLabel}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={handleInitializeDelivery} 
                  disabled={!isFormValid} 
                  className="w-full group bg-zinc-900 dark:bg-white hover:bg-yellow-500 text-white dark:text-black py-4 px-6 flex items-center justify-between transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xl"
                >
                  <span className="font-medium">{isFormValid ? "Calculate Price & Proceed" : "Complete All Fields"}</span>
                  <ChevronRight size={20} className="transition-transform group-hover:translate-x-2" />
                </button>
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
            <h1 className="text-4xl font-bold">Send a Package</h1>
            <p className="text-gray-500">Fast, reliable delivery service</p>
          </div>
        </header>

        {renderStageContent()}
      </main>
      <BottomNav />
      <ReviewModal 
        isOpen={isReviewModalOpen} 
        onClose={() => setIsReviewModalOpen(false)} 
        onSubmit={handleReviewSubmit} 
      />
    </div>
  );
}

const DetailInput: React.FC<DetailInputProps> = ({ label, icon: Icon, placeholder, value, onChange, error }) => (
  <div className={`border-b pb-2 transition-colors ${error ? 'border-red-500' : 'border-zinc-200 dark:border-white/10 focus-within:border-yellow-500'}`}>
    <label className={`flex items-center gap-2 text-sm font-medium mb-2 ${error ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
      <Icon size={16} className={error ? 'text-red-500' : 'text-yellow-500/50'} /> {label}
    </label>
    <input 
      type="text" placeholder={placeholder} value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-base font-normal outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);