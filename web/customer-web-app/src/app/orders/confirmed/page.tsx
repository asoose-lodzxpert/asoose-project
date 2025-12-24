'use client';

import { Check, Clock, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { OrderTimeline } from '@/components/order/OrderTimeline';
export default function OrderConfirmedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 transition-colors duration-300">
      
      <div className="w-full max-w-md space-y-6">
        
        {/* 1. SUCCESS HEADER */}
        <div className="text-center space-y-4 pt-8 md:pt-0">
          <div className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-green-500/30 animate-in zoom-in duration-500">
            <Check className="w-10 h-10 text-white stroke-[3px]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Order Confirmed!</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">We're preparing your order</p>
          </div>
        </div>

        {/* 2. ORDER DETAILS CARD */}
        <div className="bg-white dark:bg-[#151515] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 space-y-6">
           
           {/* Order Number Banner */}
           <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Order Number</span>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5 tracking-tight">#ORD-12345</p>
           </div>

           {/* Restaurant Info */}
           <div className="flex items-center gap-4 pb-6 border-b border-gray-100 dark:border-white/5">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/10 rounded-full flex items-center justify-center text-xl">
                 🍕
              </div>
              <div>
                 <h3 className="font-bold text-gray-900 dark:text-white">Joe's Pizza</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Italian • Pizza</p>
              </div>
           </div>

           {/* Address & Payment Info */}
           <div className="space-y-4">
              <div className="flex items-start gap-3">
                 <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shadow-md shadow-red-500/30" />
                 <div>
                    <p className="text-xs text-gray-400 font-bold mb-0.5">Delivery Address</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">123 Main St, Apt 4B</p>
                 </div>
              </div>
              
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 font-medium">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span>Paid with Visa ••1234</span>
                 </div>
                 <span className="font-black text-lg text-gray-900 dark:text-white">$27.98</span>
              </div>
           </div>

           {/* Delivery Estimate Banner */}
           <div className="bg-yellow-500 text-black p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-yellow-500/20">
              <Clock className="w-5 h-5" />
              <span>Delivery in 25-35 minutes</span>
           </div>
        </div>

        {/* 3. TIMELINE SECTION */}
        <OrderTimeline />

        {/* 4. ACTIONS */}
        <div className="pb-8 space-y-3">
           <Link href="/dashboard" className="block w-full bg-gray-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-center shadow-lg active:scale-[0.98] transition-all">
              Track Order
           </Link>
           <Link href="/dashboard" className="block w-full text-center py-3 text-gray-500 dark:text-gray-400 font-bold text-sm hover:text-gray-900 dark:hover:text-white transition-colors">
              Back to Home
           </Link>
        </div>

      </div>
    </div>
  );
}