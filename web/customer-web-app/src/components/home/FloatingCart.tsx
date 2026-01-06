'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useRouter } from 'next/navigation';

export const FloatingCart = () => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  
  const totalItems = useCartStore(state => state.getTotalItems());
  const totalPrice = useCartStore(state => state.getTotalPrice());
  
  useEffect(() => {
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (!mounted || totalItems === 0) return null; 

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[999] md:hidden"> 
      <button 
        onClick={() => router.push('/checkout')} 
        className="w-full bg-yellow-500 text-black py-3 px-4 rounded-xl shadow-2xl shadow-yellow-500/20 flex items-center justify-between active:scale-[0.98] transition-transform border border-yellow-400"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black/10 rounded-lg flex items-center justify-center relative">
            <ShoppingBag className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-sm">
               {totalItems}
            </div>
          </div>
          <div className="flex flex-col items-start">
            <div className="text-sm font-bold">View Cart</div>
            <div className="text-xs opacity-75">Checkout now</div>
          </div>
        </div>
        <div className="text-lg font-black">
            ₦{totalPrice.toLocaleString()}
        </div>
      </button>
    </div>
  );
};