'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useSession } from 'next-auth/react';
import { WifiOff, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { paymentService, InitiatePaymentPayload } from '@/services/payment.service';
import { PAYMENT_METHODS } from '../ride/constants/config';

// Components
import { Address } from './types';
import { AddAddressModal } from '@/app/main/components/checkout/addadressmodal';
import { CartItemsList } from '@/app/main/components/checkout/cartitemslist';
import { OrderSummary } from '@/app/main/components/checkout/ordersummary';
import { AddressSection } from '@/app/main/components/checkout/addresssection';

// Constants
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SERVICE_FEE_PERCENTAGE = 0.05;
const BASE_DELIVERY_FEE = 1500;

export default function CheckoutForm() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track if order was created to prevent phantom redirects
  const isOrderCreated = useRef(false);

  // State
  const [mounted, setMounted] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<typeof PAYMENT_METHODS[number] | null>(null);

  // Store
  const { items: cartItems, getTotalPrice, addItem, decreaseItem, removeItem, clearCart } = useCartStore();

  // Fees
  const cartTotal = getTotalPrice();
  const estimatedDeliveryFee = BASE_DELIVERY_FEE;
  const serviceFee = Math.round(cartTotal * SERVICE_FEE_PERCENTAGE);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      abortControllerRef.current?.abort();
      setIsProcessing(false);
    };
  }, []);

  const fetchAddresses = useCallback(async () => {
    if (status !== 'authenticated') {
      if (status === 'unauthenticated') setIsLoadingAddresses(false);
      return;
    }

    const token = session?.accessToken;
    if (!token) {
      setIsLoadingAddresses(false);
      return;
    }

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoadingAddresses(true);
      
      const res = await fetch(`${API_URL}/users/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal,
      });

      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
        if (defaultAddr) setSelectedAddress(defaultAddr);
      } else {
        toast.error('Failed to load addresses');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error('Failed to load addresses');
      }
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAddresses();
    }
  }, [status, fetchAddresses]);

  // Prevent redirect if order was just created
  useEffect(() => {
    if (mounted && cartItems.length === 0 && !isOrderCreated.current) {
      router.push('/');
    }
  }, [mounted, cartItems, router]);

  const handleSaveAddress = async (addressData: Partial<Address>) => {
    const token = session?.accessToken;
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/users/addresses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to add address');

      await fetchAddresses();
      setSelectedAddress(json);
      toast.success('Address added successfully');
      setShowAddAddressModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address');
    }
  };

  // ✅ FIXED: Payment Processing Logic
  const processPayment = async (orderId: string, orderTotal: number) => {
    try {
      if (!selectedPaymentMethod) return;

      localStorage.setItem('pending_checkout', 'true');
      localStorage.setItem('last_order_id', orderId);

      const paymentPayload: InitiatePaymentPayload = {
        amount: orderTotal,
        email: session?.user?.email || 'customer@example.com',
        gateway: selectedPaymentMethod.gateway as any,
        method: 'CARD',
        type: 'ORDER',
        orderId: orderId,
      };

      // ✅ Pass token explicitly to avoid 401
      const token = session?.accessToken;
      if (!token) throw new Error("Authentication missing");

      const paymentRes = await paymentService.initiatePayment(paymentPayload, token);

      if (paymentRes.authorizationUrl) {
        window.location.href = paymentRes.authorizationUrl;
      } else {
        throw new Error('Payment authorization URL not received');
      }
    } catch (paymentError: any) {
      console.error('Payment initialization error:', paymentError);
      
      // ✅ Handle graceful failure: Order is created, but payment failed.
      // Do NOT clear pending_checkout flag here; allow recovery.
      
      toast.warn("Payment initialization failed. Please try paying from Order Details.");
      router.push(`/main/orders/confirmed?id=${orderId}`);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isOnline) {
      toast.error('No internet connection.');
      return;
    }
    if (!selectedAddress || !selectedPaymentMethod) {
      toast.error('Please select address and payment method');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const restaurantId = cartItems[0].restaurantId;
    const token = session?.accessToken;

    if (!token) {
      toast.error('Please log in to place an order');
      return;
    }

    setIsProcessing(true);

    try {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        addressId: selectedAddress.id,
        restaurantId: restaurantId,
        items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })),
      };

      // 1. Create Order
      const res = await fetch(`${API_URL}/users/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order creation failed');

      // ✅ CRITICAL FIX: Order created successfully. Clear cart immediately.
      // This prevents "Cart not cleared" bugs if payment logic throws/redirects.
      isOrderCreated.current = true;
      clearCart();

      // 2. Handle Payment
      if (selectedPaymentMethod.type === 'CASH') {
        localStorage.removeItem('pending_checkout');
        localStorage.removeItem('last_order_id');
        
        await Swal.fire({
          icon: 'success',
          title: 'Order Placed!',
          text: `Order #${data.id.slice(0, 8)} confirmed.`,
          confirmButtonColor: '#EAB308',
          timer: 2000
        });
        
        router.push(`/main/orders/confirmed?id=${data.id}`);
      } else {
        // Attempt Online Payment
        await processPayment(data.id, data.total);
      }
    } catch (error: any) {
      console.error('Order placement error:', error);
      toast.error(error.message || 'Something went wrong.');
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
      {!isOnline && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center gap-3 text-orange-800">
            <WifiOff className="w-5 h-5" />
            <span className="font-bold">No Internet Connection</span>
          </div>
        </div>
      )}

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
              retryCount={0}
              selectedMethod={selectedPaymentMethod}
              onSelectMethod={setSelectedPaymentMethod}
            />
          </div>
        </div>
      </main>

      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        onSave={handleSaveAddress}
      />
    </div>
  );
}