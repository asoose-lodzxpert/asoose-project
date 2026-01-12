'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { createClient } from '../../../../utils/supabase/client';
import { ChevronLeft, WifiOff, AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

// Components
import { Address } from './types';
import { AddAddressModal } from '@/app/main/components/checkout/addadressmodal';
import { CartItemsList } from '@/app/main/components/checkout/cartitemslist';
import { OrderSummary } from '@/app/main/components/checkout/ordersummary';
import { AddressSection } from '@/app/main/components/checkout/addresssection';
// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Store
  const { items: cartItems, getTotalPrice, addItem, decreaseItem, removeItem, clearCart } = useCartStore();
  
  // Fees
  const cartTotal = getTotalPrice();
  const estimatedDeliveryFee = 1500; // Client-side estimate
  const serviceFee = Math.round(cartTotal * 0.05);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);
    fetchAddresses();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (mounted && cartItems.length === 0) router.push('/');
  }, [mounted, cartItems, router]);

  // --- API Helpers ---

  const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      toast.error('Session expired');
      router.push('/sign-in');
      return null;
    }
    return session;
  };

  const fetchAddresses = async () => {
    const session = await getSession();
    if (!session) return;

    try {
      setIsLoadingAddresses(true);
      const res = await fetch(`${API_URL}/users/addresses`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
        if (defaultAddr) setSelectedAddress(defaultAddr);
      }
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // --- Actions ---

  const handleSaveAddress = async (data: any) => {
    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      
      if (!res.ok) {
        // Handle Backend Geofencing Error
        if (json.message && json.message.includes('outside')) {
          throw new Error('This location is outside our service area.');
        }
        throw new Error(json.message || 'Failed to add address');
      }

      await fetchAddresses();
      setSelectedAddress(json);
      toast.success('Address added');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isOnline) return toast.error('No internet connection');
    if (!selectedAddress) return toast.error('Select an address');
    
    const session = await getSession();
    if (!session) return;

    setIsProcessing(true);
    setRetryCount(0);

    try {
      // 1. Generate Idempotency Key (UUID)
      // This ensures if the network retries, the backend won't double charge
      const idempotencyKey = crypto.randomUUID(); 

      const payload = {
        addressId: selectedAddress.id,
        restaurantId: cartItems[0].restaurantId,
        items: cartItems.map((i) => ({ id: i.id, quantity: i.quantity })),
      };

      const res = await fetch(`${API_URL}/users/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'Idempotency-Key': idempotencyKey, // <-- Sent to backend
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) throw new Error('Order already processing');
        throw new Error(data.message || 'Order failed');
      }

      // 2. Success: Use Backend Total
      // The backend calculated the exact distance fee. Use that total.
      const finalTotal = data.total;

      await Swal.fire({
        icon: 'success',
        title: 'Order Placed!',
        html: `
          <div class="text-left space-y-2">
             <p>Order <strong>#${data.id.slice(0, 8)}</strong> confirmed.</p>
             <p>Total: <strong>₦${finalTotal.toLocaleString()}</strong></p>
          </div>
        `,
        confirmButtonColor: '#EAB308',
        confirmButtonText: 'View Order',
      });

      clearCart();
      router.push(`/profile/orders/${data.id}`);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-32 lg:pb-10">
      
      {/* Header */}
      {/* <div className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 px-4 h-16 flex items-center justify-between"> */}
        {/* <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Checkout</h1> */}
        {/* <div className="w-8" /> */}
      {/* </div> */}

      {/* Alerts */}
      {!isOnline && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3 text-orange-800">
            <WifiOff className="w-5 h-5" />
            <span className="font-bold">No Internet Connection</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AddressSection 
            addresses={addresses} 
            selectedAddress={selectedAddress} 
            isLoading={isLoadingAddresses}
            onSelect={setSelectedAddress}
            onAddNew={() => setShowAddAddressModal(true)}
            isProcessing={isProcessing}
          />

          <CartItemsList 
            items={cartItems}
            isProcessing={isProcessing}
            onAdd={addItem}
            onDecrease={decreaseItem}
            onRemove={removeItem}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary 
              cartTotal={cartTotal}
              deliveryFee={estimatedDeliveryFee}
              serviceFee={serviceFee}
              isProcessing={isProcessing}
              isDisabled={isProcessing || !selectedAddress || !isOnline}
              onPlaceOrder={handlePlaceOrder}
              retryCount={retryCount}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddAddressModal 
        isOpen={showAddAddressModal} 
        onClose={() => setShowAddAddressModal(false)}
        onSave={handleSaveAddress}
      />
    </div>
  );
}