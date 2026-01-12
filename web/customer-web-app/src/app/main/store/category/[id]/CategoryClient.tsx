'use client';

import React, { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, SearchX, SlidersHorizontal, 
  ChevronDown, Loader2 
} from 'lucide-react';
import { HomeHeader } from '@/app/main/components/home/HomeHeader';
import { RestaurantCard } from '@/app/main/components/home/RestaurantCard';
import { AppFooter } from '@/app/main/components/layout/AppFooter';
import  BottomNav  from '@/app/main/components/layout/BottomNav';
import { FloatingCart } from '@/app/main/components/home/FloatingCart';

// --- TYPES ---
export interface Vendor {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  rating: number;
  deliveryTime?: string;
  deliveryFee: number;
  prepTime?: number;
  type: string;
  address?: string;
}

export interface CategoryData {
  id: string;
  title: string;
  vendors: Vendor[];
}

interface CategoryClientProps {
  data: CategoryData;
  categoryId: string;
  activeFilter: string;
  filters: Record<string, string>;
}

export default function CategoryClient({ 
  data, 
  categoryId, 
  activeFilter,
  filters 
}: CategoryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for header styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatTitle = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);
  
  const handleFilterClick = (filterSlug: string) => {
    if (filterSlug === activeFilter) return;
    startTransition(() => {
      router.push(`/store/category/${categoryId}?filter=${filterSlug}`, { scroll: false });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      <HomeHeader />

      <main className="max-w-7xl mx-auto min-h-[80vh]">
        {/* --- HERO / HEADER SECTION --- */}
        <div className="px-4 pt-6 pb-2">
           <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
               <Link href="/store" className="hover:text-yellow-500 transition-colors">Marketplace</Link>
               <ChevronDown className="w-3 h-3 -rotate-90" />
               <span className="text-gray-900 dark:text-white font-medium capitalize">
                  {data.title || categoryId}
               </span>
            </div>

            <div className="flex justify-between items-end mb-2">
              <div>
                <h1 className="text-3xl md:text-4xl font-black capitalize tracking-tight mb-2">
                  {data.title || formatTitle(categoryId)}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {data.vendors.length} {data.vendors.length === 1 ? 'store' : 'stores'} near you
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- STICKY FILTER BAR --- */}
        <div className={`sticky top-[0px] z-20 py-3 px-4 mb-6 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/5 shadow-sm' 
            : 'bg-transparent'
        }`}>
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shrink-0">
               <SlidersHorizontal className="w-4 h-4" />
               <span className="sr-only sm:not-sr-only text-sm font-bold">Filters</span>
            </button>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-1"></div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide w-full">
              {Object.entries(filters).map(([label, slug]) => {
                const isActive = activeFilter === slug;
                return (
                  <button
                    key={slug}
                    onClick={() => handleFilterClick(slug)}
                    disabled={isPending}
                    className={`relative px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border touch-manipulation ${
                      isActive 
                        ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/20 scale-105' 
                        : 'bg-white dark:bg-[#151515] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    } ${isPending ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <span className={isPending && isActive ? 'opacity-0' : 'opacity-100'}>
                      {label}
                    </span>
                    {isPending && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- VENDOR GRID --- */}
        <div className="px-4">
          <div className={`transition-all duration-500 ${isPending ? 'opacity-50 scale-[0.99] grayscale-[0.5]' : 'opacity-100 scale-100'}`}>
            {data.vendors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.vendors.map((vendor, index) => (
                  <div 
                    key={vendor.id} 
                    className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Link href={`/store/${vendor.slug || vendor.id}`} className="block h-full">
                      <RestaurantCard
                        name={vendor.name}
                        image={vendor.image}
                        rating={vendor.rating}
                        time={vendor.deliveryTime || '30-45 min'}
                        deliveryFee={vendor.deliveryFee}
                        tags={[vendor.type]} // Backend typically sends one type, but UI accepts array
                      />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <SearchX className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">No matches found</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                  We couldn't find any stores matching "{activeFilter}" in this category.
                </p>
                {activeFilter !== 'all' && (
                  <button 
                    onClick={() => handleFilterClick('all')}
                    className="px-6 py-2.5 bg-yellow-500 text-white font-bold rounded-xl shadow-lg shadow-yellow-500/20 hover:bg-yellow-600 transition-all active:scale-95"
                  >
                    View All Stores
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <FloatingCart />
      <BottomNav />
      <AppFooter />
    </div>
  );
}