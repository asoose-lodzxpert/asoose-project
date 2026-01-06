'use client';

import React, { useState, useEffect } from 'react';
import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { RestaurantCard } from '@/components/home/RestaurantCard';
import { FloatingCart } from '@/components/home/FloatingCart';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppFooter } from '@/components/layout/AppFooter';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CustomerHome() {
  const [activeCategory, setActiveCategory] = useState('all');
  
  // State for Real Data
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  // Fetch Data on Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/marketplace/home`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        
        // Transform Categories for UI (Add 'All' option manually)
        const uiCategories = [
          { id: 'all', label: 'All', image: '/icons/all.png' },
          ...data.categories.map((c: any) => ({
             id: c.id, 
             label: c.name, 
             image: c.image 
          }))
        ];
        
        setCategories(uiCategories);
        setRestaurants(data.restaurants);
      } catch (err) {
        console.error("Home fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter Logic
  const filteredRestaurants = activeCategory === 'all' 
    ? restaurants 
    : restaurants.filter(r => r.products.some((p: any) => p.categoryId === activeCategory));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 flex flex-col">
      
      <HomeHeader />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 space-y-8 pb-24 md:pb-0">

        {/* Categories from DB */}
        <CategoryScroll 
            categories={categories} 
            activeId={activeCategory} 
            onSelect={setActiveCategory} 
        />
        {/* banner */}
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

        {/* POPULAR NEAR YOU (Real Data) */}
        <section>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-black tracking-tight">Top Restaurants</h3>
             <button className="text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80">See All</button>
          </div>
          
          <div className="flex overflow-x-auto gap-4 -mx-4 px-4 pb-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:mx-0 md:px-0">
            {filteredRestaurants.length > 0 ? (
              filteredRestaurants.map((item) => (
                <Link
                href={`/restaurant/${item.id}`}
                key={item.id} 
                >
                
                                <RestaurantCard 
                    
                    data={{
                        id: item.id,
                        name: item.name,
                        image: item.image,
                        rating: item.rating,
                        time: item.deliveryTime,
                        delivery: "₦500", 
                        tags: item.products.slice(0, 2).map((p:any) => p.name), // Show first 2 products as tags
                        discount: null
                    }} 
                />

                </Link>
              ))
            ) : (
                <div className="w-full text-center text-gray-400 py-10">No restaurants found in this category.</div>
            )}
          </div>
        </section>

      </div>

      <FloatingCart count={0} total="₦0.00" />
      <BottomNav />
      <AppFooter />
    </div>
  );
}