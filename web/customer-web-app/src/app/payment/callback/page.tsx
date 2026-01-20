'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useCartStore } from '@/store/useCartStore';
import { useDeliveryStore } from '@/app/main/store/useDeliveryStore';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { resetDelivery } = useDeliveryStore();

  useEffect(() => {
    const status = searchParams.get('status');
    const reference = searchParams.get('reference');
    // Note: Backend might not pass order_id/ride_id in query params, 
    // so we rely on the status and last known state or redirect to a dashboard.
    
    const handleCompletion = async () => {
      if (status === 'SUCCESS' || status === 'successful') {
        toast.success('Payment Successful!');
        
        // Cleanup stores based on context (local storage checks can be added here)
        // For now, we clear the cart as a safety measure if coming from checkout
        if (localStorage.getItem('pending_checkout')) {
            clearCart();
            localStorage.removeItem('pending_checkout');
            const orderId = localStorage.getItem('last_order_id');
            router.push(orderId ? `/main/orders/${orderId}` : '/main/orders');
            return;
        }

        if (localStorage.getItem('pending_ride')) {
            localStorage.removeItem('pending_ride');
            router.push('/main/ride');
            return;
        }

        if (localStorage.getItem('pending_delivery')) {
            resetDelivery();
            localStorage.removeItem('pending_delivery');
            router.push('/main/delivery');
            return;
        }

        router.push('/dashboard');
      } else {
        toast.error('Payment Failed or Cancelled');
        router.back();
      }
    };

    handleCompletion();
  }, [searchParams, router, clearCart, resetDelivery]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verifying Transaction...</h2>
      <p className="text-gray-500">Please do not close this window.</p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}