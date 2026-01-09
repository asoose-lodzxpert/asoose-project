'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Clock, CreditCard, ArrowRight, MapPin, Receipt, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { OrderTimeline } from '@/components/order/OrderTimeline';
import { createClient } from '../../../../utils/supabase/client';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/sign-in'); return; }

      try {
        const res = await fetch(`${API_URL}/users/orders/${orderId}`, {
           headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error("Order not found");
        setOrder(await res.json());

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
  
  if (!order) return <div className="min-h-screen flex flex-col items-center justify-center">Order not found <Link href="/" className="text-yellow-500 font-bold mt-4">Go Home</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center p-4 transition-colors duration-300">
      
      {/* Back Button (Mobile) */}
      <div className="w-full max-w-md mb-4 flex md:hidden">
         <button onClick={() => router.back()} className="p-2 bg-white dark:bg-white/10 rounded-full">
            <ChevronLeft className="w-6 h-6" />
         </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        
        {/* 1. STATUS HEADER */}
        <div className="text-center space-y-4 pt-4 md:pt-0">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-2xl animate-in zoom-in duration-500 ${
              order.status === 'PENDING' ? 'bg-yellow-500 shadow-yellow-500/30' : 
              order.status === 'DELIVERED' ? 'bg-green-500 shadow-green-500/30' : 'bg-blue-500'
          }`}>
            <Check className="w-10 h-10 text-white stroke-[3px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {order.status === 'PENDING' ? 'Order Received!' : 
                 order.status === 'PROCESSING' ? 'Preparing Food...' : 'Order Delivered'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">Thank you for ordering</p>
          </div>
        </div>

        {/* 2. TIMELINE */}
        <OrderTimeline status={order.status} />

        {/* 3. ORDER DETAILS CARD */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
           
           {/* Order Number Banner */}
           <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Order ID</span>
                <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5 tracking-tight">#{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total</span>
                <p className="text-lg font-black text-yellow-600 dark:text-yellow-500 mt-0.5 tracking-tight">₦{order.total.toLocaleString()}</p>
              </div>
           </div>

           {/* Items List */}
           <div className="space-y-4 border-b border-gray-100 dark:border-white/5 pb-6">
              <h3 className="font-bold text-sm text-gray-400 uppercase">Items Ordered</h3>
              {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                          <span className="font-bold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 px-2 py-0.5 rounded text-xs">
                              {item.quantity}x
                          </span>
                          <span className="text-gray-900 dark:text-gray-200 font-medium">{item.name}</span>
                      </div>
                      <span className="text-gray-500">₦{item.price.toLocaleString()}</span>
                  </div>
              ))}
           </div>

           {/* Address Info */}
           <div className="flex items-start gap-3">
              <div className="mt-1 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500">
                 <MapPin className="w-4 h-4" />
              </div>
              <div>
                 <p className="text-xs text-gray-400 font-bold mb-0.5">Delivery Address</p>
                 <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {order.addressDetails ? order.addressDetails.address : "Address not found"}
                 </p>
                 <p className="text-xs text-gray-500">{order.addressDetails?.city}</p>
              </div>
           </div>
           
           {/* Delivery Estimate */}
           <div className="bg-yellow-500 text-black p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-yellow-500/20">
              <Clock className="w-5 h-5" />
              <span>
                 {order.status === 'DELIVERED' ? 'Arrived' : 'Est. Delivery: 30-45 mins'}
              </span>
           </div>
        </div>

        {/* 4. ACTIONS */}
        <div className="pb-8 space-y-3">
           <Link href="/" className="block w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-center shadow-lg active:scale-[0.98] transition-all">
              Order Something Else
           </Link>
           <Link href="/profile" className="block w-full text-center py-3 text-gray-500 dark:text-gray-400 font-bold text-sm hover:text-gray-900 dark:hover:text-white transition-colors">
              View All Orders
           </Link>
        </div>

      </div>
    </div>
  );
}