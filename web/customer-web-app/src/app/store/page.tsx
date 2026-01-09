'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ChevronRight } from 'lucide-react';
import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { RestaurantCard } from '@/components/home/RestaurantCard';
import { AppFooter } from '@/components/layout/AppFooter';
import { BottomNav } from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/home/FloatingCart';
import { StoreSkeleton } from './skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const VERTICAL_ICONS: Record<string, string> = {
  RESTAURANT: '🍔',
  GROCERY: '🥦',
  PHARMACY: '💊',
  MARKET: '🛍️',
};

interface VerticalSection {
  id: string;
  type: string;
  slug: string;
  title: string;
  categories: { id: string; name: string; image: string }[];
  vendors: any[];
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [verticals, setVerticals] = useState<VerticalSection[]>([]);

  useEffect(() => {
      
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/marketplace/home`);
        if (!res.ok) throw new Error('Failed to fetch home data');
        const data = await res.json();
        setVerticals(data.verticals || []); 
      } catch (err) {
        console.error("Home fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
        <StoreSkeleton/>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      
      <HomeHeader />

      <main className="max-w-7xl mx-auto space-y-8">
        
        <div className="px-4 pt-6">
          <div className="grid grid-cols-4 gap-3 sm:gap-6">
            {verticals.map((v) => (
              <a 
                key={v.id} 
                href={`#${v.id}`} 
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-[#151515] flex items-center justify-center text-3xl shadow-sm border border-gray-100 dark:border-white/5 group-hover:border-yellow-500/50 group-hover:shadow-md transition-all">
                  {VERTICAL_ICONS[v.type] || '🏪'}
                </div>
                <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                  {v.title}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* 3. Promotional Banner */}
        <div className="px-4">
          <div className="w-full h-40 sm:h-48 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl relative overflow-hidden flex items-center px-6 sm:px-10 shadow-lg shadow-orange-500/20">
             <div className="relative z-10 text-white">
                <h2 className="text-2xl sm:text-3xl font-black mb-2">Free Delivery</h2>
                <p className="font-medium opacity-90 mb-4">On your first grocery order!</p>
                <button className="bg-white text-orange-600 px-4 py-2 rounded-xl font-bold text-sm shadow-md">Order Now</button>
             </div>
             {/* Decorative circles */}
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
             <div className="absolute right-10 top-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          </div>
        </div>

        {/* 4. Render Each Vertical Section */}
        <div className="space-y-12 pb-8">
          {verticals.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              
              {/* Section Header */}
              <div className="px-4 flex justify-between items-end mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{section.title}</h2>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">Top rated near you</p>
                </div>
                <Link 
                  href={`/category/${section.id}`} 
                  className="flex items-center gap-1 text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity"
                >
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Sub-Categories (Chips) */}
              {/* FIX: Add defensive check (|| []) to prevent map undefined error */}
              <div className="mb-6">
                <CategoryScroll 
                    categories={(section.categories || []).map(c => c.name)} 
                /> 
              </div>

              {/* Vendor Horizontal List */}
              {/* FIX: Add defensive check (|| []) and use 'vendor' consistently */}
              <div className="flex gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide snap-x">
                {(section.vendors || []).map((vendor) => (
                  <div key={vendor.id} className="min-w-[280px] sm:min-w-[320px] snap-center">
                    <Link href={`/store/${vendor.slug || vendor.id}`}>
                      <RestaurantCard 
                         name={vendor.name}
                         image={vendor.image}
                         rating={vendor.rating}
                         time={vendor.deliveryTime}
                         deliveryFee={vendor.deliveryFee} 
                         tags={["Popular"]} 
                      />
                    </Link>
                  </div>
                ))}
              </div>

            </section>
          ))}
        </div>
      
      </main>

      <FloatingCart />
      <BottomNav />
      <AppFooter />
    </div>
  );
}