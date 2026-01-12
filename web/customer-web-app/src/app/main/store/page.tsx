'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Store, Bike, X, ExternalLink, ChevronRight, Utensils 
} from 'lucide-react';

// Components
import { RestaurantCard } from '@/app/main/components/home/RestaurantCard';
import { FloatingCart } from '@/app/main/components/home/FloatingCart';
import { StoreSkeleton } from './skeleton';

// --- CONFIG & TYPES ---
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const CACHE_DURATION = 5 * 60 * 1000;

interface BannerData {
  id: string; title: string; subtitle: string;
  buttonText: string; link: string; image?: string; type: 'PROMO' | 'AD';
}

interface Vendor {
  id: string; name: string; image?: string; slug?: string;
  rating: number; deliveryTime?: string; deliveryFee: number; type: string;
}

interface VerticalSection {
  id: string; title: string; vendors: Vendor[];
}

// --- DATA HOOK ---
function useStoreData(query: string | null) {
  const [data, setData] = useState<{
    verticals: VerticalSection[];
    banners: BannerData[];
  }>({ verticals: [], banners: [] });
  
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Map<string, { data: any, timestamp: number }>>(new Map());

  const fetchData = useCallback(async (q: string | null) => {
    const cacheKey = q ? `search:${q}` : 'home';
    const cached = cacheRef.current.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      setData({
        verticals: cached.data.verticals || [],
        banners: cached.data.banners || []
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const endpoint = q ? `/marketplace/search?q=${encodeURIComponent(q)}` : `/marketplace/home`;
      const res = await fetch(`${API_URL}${endpoint}`);
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();

      cacheRef.current.set(cacheKey, { data: json, timestamp: Date.now() });
      setData({ verticals: json.verticals || [], banners: json.banners || [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...data, loading, fetchData };
}

// --- MAIN COMPONENT ---
export default function StorePage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || null;
  const { verticals, banners, loading, fetchData } = useStoreData(query);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => { fetchData(query); }, [query, fetchData]);

  if (loading && verticals.length === 0) return <StoreSkeleton />;

  const activeBanner = banners.length > 0 ? banners[0] : null;

  return (
    <div className="min-h-screen bg-gray-50 mt-4 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-32">

      <main className="max-w-7xl mx-auto space-y-10 min-h-[60vh]">
        {!query && (
          <>
            {/* 1. DYNAMIC BANNER */}
            {showBanner && activeBanner && (
              <section className="px-4 pt-6">
                <div className={`w-full h-44 sm:h-56 rounded-[2rem] relative overflow-hidden flex items-center px-6 sm:px-12 shadow-2xl group
                  ${activeBanner.type === 'AD' ? 'bg-indigo-900' : 'bg-gradient-to-br from-yellow-500 to-orange-600'}`}>
                  
                  {activeBanner.image && (
                    <div className="absolute inset-0 z-0">
                      <Image src={activeBanner.image} alt={activeBanner.title} fill className="object-cover opacity-40" priority />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
                    </div>
                  )}

                  <button onClick={() => setShowBanner(false)} className="absolute top-5 right-5 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md">
                    <X className="w-4 h-4" />
                  </button>

                  <div className="relative z-10 text-white max-w-lg">
                    <h2 className="text-3xl font-black mb-2 leading-tight">{activeBanner.title}</h2>
                    <p className="text-base font-medium opacity-90 mb-6">{activeBanner.subtitle}</p>
                    <Link href={activeBanner.link} className="bg-white text-orange-600 px-6 py-3 rounded-2xl font-extrabold text-sm shadow-xl inline-flex items-center gap-2">
                      {activeBanner.buttonText} <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* 2. CATEGORY QUICK-LINKS */}
            <section className="px-4">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Utensils className="w-5 h-5 text-yellow-500" /> Shop by Category
               </h2>
               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {verticals.map((v) => (
                    <Link key={v.id} href={`/store/category/${v.id}`} className="flex flex-col items-center p-5 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 hover:border-yellow-500/30 transition-all group">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 transition-transform group-hover:scale-110">
                        <Store className="w-7 h-7" />
                      </div>
                      <span className="mt-4 text-sm font-bold">{v.title}</span>
                    </Link>
                  ))}
               </div>
            </section>

            {/* 3. DYNAMIC VERTICAL SECTIONS */}
            <div className="space-y-12 pb-12">
              {verticals.map((section) => (
                <section key={section.id} className="px-4">
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-black">{section.title}</h2>
                    <Link href={`/store/category/${section.id}`} className="text-xs font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 rounded-full">
                      See all
                    </Link>
                  </div>
                  <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {section.vendors.map((vendor) => (
                      <div key={vendor.id} className="min-w-[300px] snap-start">
                        <Link href={`/store/${vendor.slug || vendor.id}`}>
                          <RestaurantCard {...vendor} time={vendor.deliveryTime || '30 min'} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Floating Cart & Navigation */}
      <FloatingCart />
    </div>
  );
}