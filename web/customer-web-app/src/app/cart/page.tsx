'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Plus, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeliveryCard } from '@/components/cart/DeliveryCard';
import { CartItem as CartItemComponent } from '@/components/cart/CartItem';
import { useCartStore } from '@/store/useCartStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ValidatedItem {
  id: string; 
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  total: number;
  available: boolean;
}

interface VendorInfo {
  id: string;
  name: string;
  time: string;
  image?: string;
}

export default function CartPage() {
  const router = useRouter();
  const { items, decreaseItem, addItem, removeItem, clearCart } = useCartStore();

  // Server-validated state (Source of Truth for prices/totals)
  const [validatedItems, setValidatedItems] = useState<ValidatedItem[]>([]);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [totals, setTotals] = useState({ subtotal: 0, deliveryFee: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch validated cart data from backend
  useEffect(() => {
    const fetchCartSummary = async () => {
      // If client store is empty, reset state immediately
      if (items.length === 0) {
        setValidatedItems([]);
        setVendorInfo(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/cart/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(i => ({ productId: i.id, quantity: i.quantity }))
          })
        });

        if (!res.ok) throw new Error('Failed to validate cart');
        
        const data = await res.json();
        
        setValidatedItems(data.items);
        setVendorInfo(data.restaurant);
        setTotals({
            subtotal: data.subtotal,
            deliveryFee: data.deliveryFee,
            total: data.total
        });
      } catch (err) {
        console.error("Cart validation error:", err);
        // Optional: Add toast notification here
      } finally {
        setLoading(false);
      }
    };

    fetchCartSummary();
  }, [items]); // Re-fetch whenever the client-side cart changes

  // Handlers
  const handleUpdateQuantity = (id: number | string, type: 'inc' | 'dec') => {
      const itemId = String(id);
      const item = items.find(i => i.id === itemId);
      
      if (!item) return;

      if (type === 'inc') {
          // We only need basic info for incrementing existing items
          addItem({ ...item, quantity: 1 }); 
      } else {
          decreaseItem(itemId);
      }
  };

  const handleRemove = (id: number | string) => {
    removeItem(String(id));
  };

  const handlePlaceOrder = () => {
     router.push('/checkout');
  };

  // --- RENDER STATES ---

  if (loading && items.length > 0) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
              <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
          </div>
      );
  }

  if (items.length === 0) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans flex flex-col">
            <header className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="font-black text-lg">Your Cart</h1>
                <div className="w-8" /> {/* Spacer */}
            </header>
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-4xl">
                    🛒
                </div>
                <h2 className="text-xl font-bold">Your cart is empty</h2>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                    Looks like you haven't added anything to your cart yet.
                </p>
                <Link 
                    href="/home" 
                    className="mt-4 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl shadow-lg hover:bg-yellow-400 transition-colors"
                >
                    Start Shopping
                </Link>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-32 transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
         <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
         </Link>
         <h1 className="font-black text-lg">Your Cart</h1>
         <button 
            onClick={clearCart}
            className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1"
         >
            Clear Cart
         </button>
      </header>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">

        {/* --- VENDOR INFO CARD --- */}
        {vendorInfo && (
            <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden flex items-center justify-center text-xl relative">
                {vendorInfo.image ? (
                    <img src={vendorInfo.image} alt={vendorInfo.name} className="w-full h-full object-cover" />
                ) : (
                    <span>🏪</span>
                )}
            </div>
            <div>
                <h3 className="font-bold text-base">{vendorInfo.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {vendorInfo.time}
                </div>
            </div>
            </div>
        )}

        {/* --- CART ITEMS LIST --- */}
        <div className="space-y-4">
           {validatedItems.map(item => (
             <CartItemComponent 
               key={item.id}
               // We cast to any here because the component might expect 'number' for ID
               // but our backend uses UUID strings.
               {...item as any} 
               onUpdateQuantity={handleUpdateQuantity}
               onRemove={handleRemove}
             />
           ))}
        </div>

        {/* --- ADD MORE BUTTON --- */}
        <Link href={`/restaurant/${vendorInfo?.id}`} className="block w-full">
            <button className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/5 transition-colors">
            <Plus className="w-4 h-4" />
            Add More Items
            </button>
        </Link>

        {/* --- DELIVERY ADDRESS --- */}
        <section>
           <div className="flex justify-between items-end mb-3 px-1">
              <h3 className="font-bold text-base">Delivery Address</h3>
              <button className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-500/10 px-2 py-1 rounded hover:opacity-80">Change</button>
           </div>
           <DeliveryCard />
        </section>

      </div>

      {/* --- FIXED BOTTOM CHECKOUT BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/5 p-4 z-40 pb-safe">
         <div className="max-w-xl mx-auto">
            <button 
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full bg-yellow-500 text-black font-bold text-lg py-4 rounded-2xl shadow-xl shadow-yellow-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-yellow-400 disabled:opacity-70 disabled:cursor-not-allowed"
            >
               <span>Place Order</span>
               <span className="w-1 h-1 bg-black rounded-full opacity-50"></span>
               <span>₦{totals.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
            </button>
         </div>
      </div>

    </div>
  );
}