'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSession } from 'next-auth/react'; // 1. Import useSession
import { useCartStore } from '@/store/useCartStore';
import { useDeliveryStore } from '@/app/main/store/useDeliveryStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { resetDelivery } = useDeliveryStore();
  
  // 2. Get Session Data
  const { data: session } = useSession();

  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    
    // 3. Wait for session to load before verifying
    if (!session) return; 

    const reference = searchParams.get('reference');

    if (!reference) {
       toast.error('Invalid Payment Reference');
       router.replace('/main/checkout');
       return;
    }

    const verifyAndComplete = async () => {
      processedRef.current = true; 

      try {
        await useCartStore.persist.rehydrate();
        await useDeliveryStore.persist.rehydrate();

        // 4. Attach Token to Request
        const res = await fetch(`${API_URL}/payment/verify?reference=${reference}&gateway=PAYSTACK`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.accessToken || (session.user as any).accessToken}`
            }
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || 'Verification failed');
        }

        const data = await res.json();

        // 5. Check Verified Status
        if (data.status === 'SUCCESS' || data.data?.status === 'SUCCESS' || data.status === 'COMPLETED') {
            toast.success('Payment Verified & Completed');

            const isCheckout = localStorage.getItem('pending_checkout');
            const isRide = localStorage.getItem('pending_ride');
            const isDelivery = localStorage.getItem('pending_delivery');

            if (isCheckout) {
                clearCart();
                localStorage.removeItem('pending_checkout');
                const orderId = localStorage.getItem('last_order_id');
                router.replace(orderId ? `/main/orders/confirmed?id=${orderId}` : '/main/orders');
            } else if (isRide) {
                localStorage.removeItem('pending_ride');
                router.replace('/main/ride');
            } else if (isDelivery) {
                resetDelivery();
                localStorage.removeItem('pending_delivery');
                router.replace('/main/delivery');
            } else {
                router.replace('/dashboard');
            }

        } else {
            throw new Error('Payment not successful');
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error('Payment verification failed.');
        router.replace('/main/checkout');
      }
    };

    verifyAndComplete();
  }, [searchParams, router, clearCart, resetDelivery, session]); // Add session dependency

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Securely Verifying Payment...</h2>
      <p className="text-gray-500">Do not close this window.</p>
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