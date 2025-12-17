'use client';

import React, { useState } from 'react';
import { HomeHeader } from '@/app/components/home/homeHeader';
import { Search, Heart, Info, ShoppingBag, PartyPopper, MapPin, Clock, Star, Share2 } from 'lucide-react';
import { MenuTabs } from '@/app/components/restaurant/MenuTabs';
import { MenuItem } from '@/app/components/restaurant/MenuItem';
import { BottomNav } from '@/app/components/layout/BottomNav';
import { RestaurantHero } from '@/app/components/restaurant/RestaurantHero';
import { AppFooter } from '@/app/components/layout/AppFooter';
// --- MOCK DATA ---
const RESTAURANT = {
  name: "Joe's Pizza",
  image: "/hero-pizza.png",
  rating: 4.8,
  ratingCount: 234,
  time: "25-35 min",
  deliveryFee: "$2.99",
  tags: ["Pizza", "Italian"]
};

const MENU_ITEMS = [
  { id: 1, name: "Margherita Pizza", description: "Fresh mozzarella, San Marzano tomatoes, fresh basil.", price: 16.99, image: "/pizza1.png", isPopular: true },
  { id: 2, name: "Pepperoni Classic", description: "Double pepperoni, mozzarella cheese, tomato sauce.", price: 18.50, image: "/pizza2.png", isPopular: true },
  { id: 3, name: "Garlic Knots", description: "Oven-baked dough knots tossed in garlic butter.", price: 6.99, image: "/side1.png", isPopular: false },
  { id: 4, name: "Caesar Salad", description: "Romaine lettuce, croutons, parmesan cheese.", price: 12.99, image: "/salad.png", isPopular: false },
  { id: 5, name: "Italian Soda", description: "Sparkling water with fruit syrup.", price: 4.50, image: "/drink.png", isPopular: false }
];

const CATEGORIES = ["Popular", "Pizzas", "Appetizers", "Salads", "Drinks"];

export default function RestaurantPage() {
  const [activeTab, setActiveTab] = useState("Popular");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      
      {/* 1. Header (Visible on Desktop) */}
      <HomeHeader />

      <main className="max-w-7xl mx-auto md:px-6 md:py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: CONTENT (Span 2) --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Section (Rounded on Desktop) */}
            <div className="md:rounded-3xl md:overflow-hidden shadow-sm">
               <RestaurantHero {...RESTAURANT} />
            </div>

            {/* Mobile Actions (Hidden on Desktop, usually Header handles this) */}
            <div className="flex gap-3 px-4 md:px-0">
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors">
                  <Search className="w-4 h-4" /> Search
               </button>
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors group">
                  <Heart className="w-4 h-4 text-gray-400 group-hover:text-red-500 group-hover:fill-red-500 transition-colors" /> Favorite
               </button>
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors">
                  <Share2 className="w-4 h-4" /> Share
               </button>
            </div>

            {/* Promo Banner */}
            <div className="mx-4 md:mx-0 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 p-4 rounded-xl flex items-center gap-3">
               <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                 <PartyPopper className="w-5 h-5" />
               </div>
               <div>
                 <h4 className="font-bold text-sm text-yellow-900 dark:text-yellow-500">20% off orders over $25</h4>
                 <p className="text-xs opacity-70 dark:text-yellow-200/70">Discount applied automatically at checkout</p>
               </div>
            </div>

            {/* Menu Tabs (Sticky below header on Desktop) */}
            <div className="px-4 md:px-0 sticky top-[70px] z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-2">
              <MenuTabs categories={CATEGORIES} activeTab={activeTab} onSelect={setActiveTab} />
            </div>

            {/* Menu Grid */}
            <div className="px-4 md:px-0 space-y-6">
               <h3 className="text-xl font-black tracking-tight">{activeTab} Items</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {MENU_ITEMS.map((item) => (
                   <MenuItem key={item.id} {...item} />
                 ))}
               </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: SIDEBAR (Desktop Only) --- */}
          <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-24 space-y-6">
                
                {/* 1. Restaurant Info Card */}
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                   <h3 className="font-black text-lg mb-4">Restaurant Info</h3>
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold">123 Culinary Ave</p>
                            <p className="text-xs text-gray-500">0.8 miles away</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold text-green-600">Open Now</p>
                            <p className="text-xs text-gray-500">Closes at 10:00 PM</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Star className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold">4.8 (234 ratings)</p>
                            <p className="text-xs text-gray-500">Top Rated in Pizza</p>
                         </div>
                      </div>
                   </div>
                </div>

                {/* 2. Desktop Cart Summary */}
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-lg">Your Order</h3>
                      <span className="text-xs font-bold text-gray-400">Joe's Pizza</span>
                   </div>
                   
                   {/* Empty State or Cart Items */}
                   <div className="py-8 text-center text-gray-400 text-sm border-dashed border-2 border-gray-100 dark:border-white/5 rounded-xl mb-4">
                      Your cart is empty
                   </div>

                   <button className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      Checkout
                   </button>
                </div>

             </div>
          </div>

        </div>
      </main>

      {/* --- FLOATING CART (Mobile Only) --- */}
      <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
        <button className="w-full bg-yellow-500 text-black py-3 px-4 rounded-xl shadow-xl shadow-yellow-500/20 flex items-center justify-between active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black/10 rounded-lg flex items-center justify-center relative">
               <ShoppingBag className="w-5 h-5" />
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold border border-yellow-500">3</div>
            </div>
            <div className="flex flex-col items-start">
               <div className="text-sm font-bold">View Cart</div>
            </div>
          </div>
          <div className="text-lg font-black">$45.47</div>
        </button>
      </div>

      {/* Standard Navigation */}
      <BottomNav />
      <AppFooter />

    </div>
  );
}