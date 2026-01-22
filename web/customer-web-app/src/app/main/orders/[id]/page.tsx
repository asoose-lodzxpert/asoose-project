'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr'; 
import { useSession } from "next-auth/react"; 

import { OrderTimeline } from '@/app/main/components/order/OrderTimeline';
import ReportDisputeModal from '../component/reportDisputeModal';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession(); 
  const orderId = params.id as string;
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);

  // Fetcher
  const fetcher = async (url: string) => {
    if (status === 'unauthenticated') {
        router.push('/sign-in');
        throw new Error("Not authenticated");
    }
    const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch order");
    return res.json();
  };

  // SWR
  const shouldFetch = status === 'authenticated' && orderId ? `${API_URL}/users/orders/${orderId}` : null;
  const { data: order, error, isLoading, mutate } = useSWR(shouldFetch, fetcher, {
      refreshInterval: (data) => data && ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(data.status) ? 0 : 10000,
      revalidateOnFocus: true,
      dedupingInterval: 5000,
  });

  // Logic
  const { canReport, isExpired, hasDispute } = useMemo(() => {
    if (!order) return { canReport: false, isExpired: false, hasDispute: false };
    const hasActiveDispute = !!order.dispute;
    let isPastWindow = false;
    if (order.deliveredAt) {
      const delivered = new Date(order.deliveredAt);
      const window = new Date();
      window.setDate(window.getDate() - 7);
      isPastWindow = delivered < window;
    }
    const eligible = ['DELIVERED', 'CANCELLED'].includes(order.status);
    return {
      canReport: eligible && !isPastWindow && !hasActiveDispute,
      isExpired: eligible && isPastWindow && !hasActiveDispute,
      hasDispute: hasActiveDispute
    };
  }, [order]);

  if (status === 'loading' || isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  );
  
  if (status === 'unauthenticated') { router.push('/sign-in'); return null; }

  if (error || !order) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-6">
      <AlertCircle className="w-8 h-8 text-gray-300 mb-4" />
      <p className="text-sm text-gray-500 mb-4">{error?.message || "Order not found"}</p>
      <Link href="/profile" className="text-sm font-medium underline hover:text-gray-500">Back to orders</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100 p-6 pb-24 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* Minimal Header */}
        <div className="flex items-center gap-4 mb-10">
           <button onClick={() => router.back()} className="hover:opacity-50 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
           </button>
           <span className="text-xs font-mono text-gray-400 tracking-wider">#{order.id.split('-')[0].toUpperCase()}</span>
        </div>

        {/* Big Type Status */}
        <div className="mb-12">
          <h1 className="text-4xl font-light tracking-tight mb-2 capitalize">
            {order.status?.replace('_', ' ').toLowerCase()}
          </h1>
          <p className="text-sm text-gray-400">
            {order.status === 'DELIVERED' 
              ? `Arrived ${new Date(order.deliveredAt).toLocaleDateString()}` 
              : 'Tracking in real-time'}
          </p>
        </div>

        {/* Integrated Timeline */}
        <div className="mb-12 opacity-90">
            <OrderTimeline status={order.status} />
        </div>

        {/* Dispute Notice */}
        {hasDispute && (
          <div className="mb-10 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center gap-3 border border-gray-100 dark:border-gray-800">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <div className="text-sm">
              <span className="font-medium">Dispute Open</span> 
              <span className="text-gray-500 mx-2">—</span>
              <span className="text-gray-500">{order.dispute.status}</span>
            </div>
          </div>
        )}

        {/* Clean Item List */}
        <div className="space-y-6 mb-12">
           {order.items.map((item: any) => (
             <div key={item.id} className="flex justify-between items-baseline group">
                <div className="flex gap-4 items-baseline">
                  <span className="text-xs font-mono text-gray-400 w-4">{item.quantity}x</span>
                  <span className="text-sm font-medium leading-relaxed">{item.name}</span>
                </div>
                <span className="text-sm text-gray-500 font-mono">
                    {item.price.toLocaleString()}
                </span>
             </div>
           ))}
        </div>

        {/* Financials & Details */}
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800 mb-12">
           <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total</span>
              <span className="text-lg font-medium">₦{order.total.toLocaleString()}</span>
           </div>
           
           <div className="flex justify-between items-start pt-4">
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Destination</span>
              <div className="text-right max-w-[60%]">
                 <p className="text-sm font-medium">{order.addressDetails?.address || 'Pickup'}</p>
                 <p className="text-xs text-gray-400 mt-1">{order.addressDetails?.city}</p>
              </div>
           </div>
        </div>

        {/* Minimal Actions */}
        <div className="grid gap-4">
           <Link href="/store" className="w-full py-4 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg text-center hover:opacity-90 transition-opacity">
             Order Again
           </Link>
           
           {canReport && (
             <button 
               onClick={() => setIsDisputeModalOpen(true)}
               className="w-full py-3 text-sm text-gray-400 hover:text-red-500 transition-colors"
             >
               Report an issue
             </button>
           )}
           
           {isExpired && (
             <p className="text-center text-[10px] text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                Dispute window closed
             </p>
           )}
        </div>

      </div>

      <ReportDisputeModal 
        isOpen={isDisputeModalOpen} 
        onClose={() => setIsDisputeModalOpen(false)} 
        orderId={orderId} 
        onSuccess={() => mutate()} 
      />
    </div>
  );
}