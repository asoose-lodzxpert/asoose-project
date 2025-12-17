'use client';

import React, { useState } from 'react';
// import { HomeHeader } from '@/components/home/HomeHeader';
import { HomeHeader } from '../components/home/homeHeader';
import { CategoryScroll } from '../components/home/CategoryScroll';
import { RestaurantCard } from '../components/home/RestaurantCard';
import { FloatingCart } from '../components/home/FloatingCart';
import { BottomNav } from '../components/layout/BottomNav';
import { AppFooter } from '../components/layout/AppFooter';
// --- DATA ---
const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'rest', label: 'Restaurants' },
  { id: 'groc', label: 'Groceries' },
  { id: 'pharm', label: 'Pharmacy' },
  { id: 'mart', label: 'Mart' },
];

const POPULAR_NEAR_YOU = [
  {
    id: 1,
    name: "Joe's Pizza",
    image: "/food1.png",
    rating: 4.8,
    time: "25-35 min",
    delivery: "$2.99",
    tags: ["Pizza", "Italian"],
    discount: "20% OFF"
  },
  {
    id: 2,
    name: "Sushi Express",
    image: "/food2.png",
    rating: 4.9,
    time: "30-45 min",
    delivery: "Free",
    tags: ["Japanese", "Sushi"],
    discount: null
  },
  {
    id: 3,
    name: "Burger King",
    rating: 4.5,
    time: "15-25 min",
    delivery: "$1.49",
    tags: ["Burgers"],
    discount: "Free Item"
  }
];

export default function CustomerHome() {
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 flex flex-col">
      
      {/* 1. HEADER (Adapts to Mobile/Desktop) */}
      <HomeHeader />

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 space-y-8 pb-24 md:pb-0">

        <CategoryScroll 
            categories={CATEGORIES} 
            activeId={activeCategory} 
            onSelect={setActiveCategory} 
        />
        
        {/* PROMO BANNER */}
        <div className="relative w-full h-40 bg-yellow-500 rounded-2xl overflow-hidden shadow-lg p-5 flex flex-col justify-center items-start group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10 max-w-[65%]">
             <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl animate-bounce">🎉</span>
                <span className="font-black text-xs uppercase opacity-60">Limited Offer</span>
             </div>
             <h2 className="text-xl font-black text-gray-900 leading-tight mb-1">Get 20% off your first order!</h2>
             <p className="text-xs font-bold opacity-70 mb-3">Use code: FIRST20</p>
             <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform">
               Order Now
             </button>
          </div>
        </div>

        {/* POPULAR SECTION */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-black tracking-tight">Popular Near You</h3>
             <button className="text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80">See All</button>
          </div>
          
          {/* Note: snap-x is great for mobile, but grid is better for desktop. 
              We use responsive classes here to switch layout modes. */}
          <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:mx-0 md:px-0">
            {POPULAR_NEAR_YOU.map((item) => (
               // @ts-ignore 
               <RestaurantCard key={item.id} data={item} />
            ))}
          </div>
        </section>

         {/* TOP RESTAURANTS SECTION */}
         <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-black tracking-tight">Top Restaurants</h3>
             <button className="text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80">See All</button>
          </div>
          <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:mx-0 md:px-0">
            {[...POPULAR_NEAR_YOU].reverse().map((item) => (
               // @ts-ignore
               <RestaurantCard key={item.id} data={item} />
            ))}
          </div>
        </section>

      </div>

      {/* 3. FLOATING CART (Bottom-Right on Desktop, Bottom-Fixed on Mobile) */}
      <FloatingCart count={3} total="$28.50" />

      {/* 4. RESPONSIVE NAVIGATION */}
      <BottomNav />   {/* Hidden on Desktop */}
      <AppFooter />   {/* Hidden on Mobile */}

    </div>
  );
}