'use client';

import React, { useState } from 'react';
import { ArrowLeft, Clock, Plus } from 'lucide-react';
import Link from 'next/link';
import { DeliveryCard } from '../components/cart/DeliveryCard';
import { CartItem } from '../components/cart/CartItem';

// --- MOCK DATA ---
const INITIAL_CART = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Medium, Thin crust, +Mushrooms, +Extra cheese",
    price: 21.00,
    quantity: 1,
    image: "/pizza.png"
  },
  {
    id: 2,
    name: "Caesar Salad",
    description: "Large, +Grilled chicken, Extra dressing on side",
    price: 15.50,
    quantity: 2,
    image: "/salad.png"
  },
  {
    id: 3,
    name: "Garlic Bread",
    description: "Regular, +Cheese, Spicy dip",
    price: 6.99,
    quantity: 1,
    image: "/bread.png"
  }
];

const VENDOR_INFO = {
  name: "Joe's Pizza",
  time: "25-35 min",
  logo: "/logo.png"
};

export default function CartPage() {
  const [cartItems, setCartItems] = useState(INITIAL_CART);

  const handleUpdateQuantity = (id: number, type: 'inc' | 'dec') => {
    setCartItems(items => items.map(item => {
      if (item.id === id) {
        const newQty = type === 'inc' ? item.quantity + 1 : item.quantity - 1;
        return { ...item, quantity: Math.max(1, newQty) };
      }
      return item;
    }));
  };

  const handleRemove = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  // Calculate Total
  const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-32 transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-white dark:bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
         <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
         </Link>
         <h1 className="font-black text-lg">Your Cart</h1>
         <button className="text-xs font-bold text-red-500 hover:text-red-600">Clear Cart</button>
      </header>

      <div className="max-w-xl mx-auto px-4 mt-6 space-y-6">

        {/* --- VENDOR INFO CARD --- */}
        <div className="bg-white dark:bg-[#151515] p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-100 dark:border-white/5">
           <div className="w-12 h-12 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-xl">🍕</div>
           <div>
              <h3 className="font-bold text-base">{VENDOR_INFO.name}</h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                 <Clock className="w-3.5 h-3.5" />
                 {VENDOR_INFO.time}
              </div>
           </div>
        </div>

        {/* --- CART ITEMS LIST --- */}
        <div className="space-y-4">
           {cartItems.map(item => (
             <CartItem 
               key={item.id}
               {...item}
               onUpdateQuantity={handleUpdateQuantity}
               onRemove={handleRemove}
             />
           ))}
        </div>

        {/* --- ADD MORE BUTTON --- */}
        <button className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/5 transition-colors">
           <Plus className="w-4 h-4" />
           Add More Items
        </button>

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
            <button className="w-full bg-yellow-500 text-black font-bold text-lg py-4 rounded-2xl shadow-xl shadow-yellow-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
               <span>Place Order</span>
               <span className="w-1 h-1 bg-black rounded-full opacity-50"></span>
               <span>${total.toFixed(2)}</span>
            </button>
         </div>
      </div>

    </div>
  );
}