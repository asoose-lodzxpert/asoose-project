'use client';

<<<<<<< HEAD
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
=======
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
>>>>>>> store_production_ready
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Store, X, ChevronRight, Utensils, Loader2, 
  ShoppingBasket, Pizza, Coffee, Gift, BriefcaseMedical, 
<<<<<<< HEAD
  Carrot, Sandwich, Truck
=======
  Carrot, Sandwich, Truck, Heart, Star, Zap, Percent, SearchX
>>>>>>> store_production_ready
} from 'lucide-react';

// Components
import { RestaurantCard } from '@/app/main/components/home/RestaurantCard';
import { FloatingCart } from '@/app/main/components/home/FloatingCart';
import { StoreSkeleton } from './skeleton';

// --- CONFIG & TYPES ---

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const CACHE_DURATION = 5 * 60 * 1000;

interface BannerData {
  id: string; title: string; subtitle: string;
  buttonText: string; link: string; image?: string; type: 'PROMO' | 'AD';
}

<<<<<<< HEAD
interface RawVendor {
  id: string; 
  name: string; 
  image?: string; 
  banner?: string;
  logo?: string;
  slug?: string;
  rating: number; 
  deliveryTime?: string; 
  deliveryFee: number; 
  type: string;
}

interface Vendor extends RawVendor {
  // Normalized fields will be guaranteed
=======
interface Vendor {
  id: string; name: string; image?: string; slug?: string;
  rating: number; deliveryTime?: string; deliveryFee: number; type: string;
  isNew?: boolean; 
>>>>>>> store_production_ready
}

interface VerticalSection {
  id: string; title: string; vendors: RawVendor[];
}

// ✅ NEW: Normalize vendor data to ensure all image fields exist
function normalizeVendor(vendor: RawVendor): Vendor {
  // Create fallback chain: prefer logo/banner, fall back to image, then placeholders
  const normalizedLogo = vendor.logo || vendor.image || '/placeholder-logo.png';
  const normalizedBanner = vendor.banner || vendor.image || vendor.logo || '/placeholder-banner.png';
  
  return {
    ...vendor,
    image: normalizedLogo,      // For backwards compatibility
    logo: normalizedLogo,        // Explicit logo
    banner: normalizedBanner,    // Explicit banner
  };
}

// --- HELPER: GET CATEGORY ICON ---
const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
<<<<<<< HEAD
  if (t.includes('restaurant') || t.includes('food')) return <Utensils className="w-7 h-7" />;
  if (t.includes('grocery') || t.includes('market')) return <ShoppingBasket className="w-7 h-7" />;
  if (t.includes('pharmacy') || t.includes('health') || t.includes('med')) return <BriefcaseMedical className="w-7 h-7" />;
  if (t.includes('fast food') || t.includes('burger')) return <Sandwich className="w-7 h-7" />;
  if (t.includes('pizza')) return <Pizza className="w-7 h-7" />;
  if (t.includes('coffee') || t.includes('cafe')) return <Coffee className="w-7 h-7" />;
  if (t.includes('fresh') || t.includes('veg')) return <Carrot className="w-7 h-7" />;
  if (t.includes('courier') || t.includes('send')) return <Truck className="w-7 h-7" />;
  if (t.includes('gift')) return <Gift className="w-7 h-7" />;
  
  return <Store className="w-7 h-7" />;
=======
  if (t.includes('restaurant') || t.includes('food')) return <Utensils className="w-6 h-6" />;
  if (t.includes('grocery') || t.includes('market')) return <ShoppingBasket className="w-6 h-6" />;
  if (t.includes('pharmacy') || t.includes('health') || t.includes('med')) return <BriefcaseMedical className="w-6 h-6" />;
  if (t.includes('fast food') || t.includes('burger')) return <Sandwich className="w-6 h-6" />;
  if (t.includes('pizza')) return <Pizza className="w-6 h-6" />;
  if (t.includes('coffee') || t.includes('cafe')) return <Coffee className="w-6 h-6" />;
  if (t.includes('fresh') || t.includes('veg')) return <Carrot className="w-6 h-6" />;
  if (t.includes('courier') || t.includes('send')) return <Truck className="w-6 h-6" />;
  if (t.includes('gift')) return <Gift className="w-6 h-6" />;
  return <Store className="w-6 h-6" />;
>>>>>>> store_production_ready
};

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
      // In case of error, set empty to stop loading spinner
      setData({ verticals: [], banners: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...data, loading, fetchData };
}

// --- INFINITE SCROLL HOOK ---
function useInfiniteStores(enabled: boolean) {
  const [stores, setStores] = useState<RawVendor[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore || !enabled) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/marketplace/stores?page=${page}&limit=10`);
      if (!res.ok) throw new Error('Failed to load more stores');
      const data = await res.json();
      
      setStores(prev => [...prev, ...data.stores]);
      setHasMore(data.meta.hasMore);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, enabled]);

  return { stores, loading, hasMore, fetchMore };
}

// --- MAIN PAGE COMPONENT ---
export default function StorePage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() || null;
  
  // Data
  const { verticals, banners, loading: initialLoading, fetchData } = useStoreData(query);
  const { stores, loading: moreLoading, hasMore, fetchMore } = useInfiniteStores(!query);
  
  // UI State
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [filter, setFilter] = useState<'ALL' | 'RATING' | 'FAST' | 'OFFERS'>('ALL');
  const [favorites, setFavorites] = useState<string[]>([]);
  const observerTarget = useRef(null);

  useEffect(() => { fetchData(query); }, [query, fetchData]);

<<<<<<< HEAD
  // ✅ NEW: Normalize all vendor data with useMemo
  const normalizedVerticals = useMemo(() => {
    return verticals.map(vertical => ({
      ...vertical,
      vendors: vertical.vendors.map(normalizeVendor)
    }));
  }, [verticals]);

  const normalizedStores = useMemo(() => {
    return stores.map(normalizeVendor);
  }, [stores]);

  // Intersection Observer implementation
=======
  // Banner Carousel Logic
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Infinite Scroll Observer
>>>>>>> store_production_ready
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !query) fetchMore(); },
      { threshold: 0.1 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [fetchMore, hasMore, query]);

  // Toggle Favorite
  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Client-Side Filter Logic
  const filteredStores = useMemo(() => {
    let result = [...stores];
    if (filter === 'RATING') result.sort((a, b) => b.rating - a.rating);
    if (filter === 'FAST') result.sort((a, b) => parseInt(a.deliveryTime || '30') - parseInt(b.deliveryTime || '30'));
    if (filter === 'OFFERS') result = result.filter(s => s.deliveryFee === 0);
    return result;
  }, [stores, filter]);

  // Flatten Search Results (since API returns verticals)
  const searchResults = useMemo(() => {
    if (!query) return [];
    return verticals.flatMap(v => v.vendors);
  }, [verticals, query]);

  // Show skeleton only on initial load
  if (initialLoading) return <StoreSkeleton />;

  const activeBanner = banners[activeBannerIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-32 font-sans">
      <main className="max-w-7xl mx-auto space-y-8 min-h-[60vh]">
        
        {/* =========================================
            SCENARIO 1: HOME PAGE (NO SEARCH)
           ========================================= */}
        {!query && (
          <>
            {/* 1. CAROUSEL BANNER SECTION */}
            {activeBanner && (
              <section className="px-4 pt-4 sm:pt-6 relative group">
                <div className={`
                  w-full h-[180px] xs:h-[200px] sm:h-56 md:h-64 
                  rounded-3xl sm:rounded-[2rem] 
                  relative overflow-hidden flex items-center 
                  px-6 sm:px-12 shadow-xl transition-all duration-500 ease-in-out
                  ${activeBanner.type === 'AD' ? 'bg-indigo-900' : 'bg-gradient-to-r from-yellow-500 to-orange-600'}
                `}>
                  {activeBanner.image && (
                    <div className="absolute inset-0 z-0">
                      <Image 
                        src={activeBanner.image} 
                        alt={activeBanner.title} 
                        fill 
                        className="object-cover opacity-30 mix-blend-overlay"
                        priority 
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    </div>
                  )}

                  <div className="relative z-10 text-white max-w-lg space-y-3 sm:space-y-4 animate-in slide-in-from-bottom-4 duration-700">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-white/10">
                      {activeBanner.type === 'AD' ? 'Sponsored' : 'Featured'}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
                      {activeBanner.title}
                    </h2>
                    <p className="text-sm sm:text-base font-medium opacity-90 line-clamp-2">
                      {activeBanner.subtitle}
                    </p>
                    <Link 
                      href={activeBanner.link}
                      className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      {activeBanner.buttonText}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Carousel Dots */}
                {banners.length > 1 && (
                  <div className="absolute bottom-6 right-8 z-20 flex gap-2">
                    {banners.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveBannerIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === activeBannerIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 2. CATEGORY RAIL (Mobile Friendly Horizontal Scroll) */}
            <section className="px-4">
<<<<<<< HEAD
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Utensils className="w-5 h-5 text-yellow-500" /> Shop by Category
               </h2>
               <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {normalizedVerticals.map((v) => (
                    <Link key={v.id} href={`/main/store/category/${v.id}`} className="flex flex-col items-center p-5 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 hover:border-yellow-500/30 transition-all group">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/10 text-yellow-600 transition-transform group-hover:scale-110">
=======
               <div className="flex justify-between items-center mb-4 px-1">
                  <h2 className="text-lg font-bold">Categories</h2>
                  <Link href="/main/store/categories" className="text-yellow-600 dark:text-yellow-500 text-xs font-bold hover:underline">
                    View All
                  </Link>
               </div>
               <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-6 lg:grid-cols-8">
                  {verticals.map((v) => (
                    <Link key={v.id} href={`/main/store/category/${v.id}`} className="min-w-[72px] snap-start flex flex-col items-center gap-2 group cursor-pointer">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 transition-all shadow-sm">
>>>>>>> store_production_ready
                        {getCategoryIcon(v.title)}
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-center truncate w-full text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors capitalize">
                        {v.title}
                      </span>
                    </Link>
                  ))}
               </div>
            </section>

<<<<<<< HEAD
            {/* 3. DYNAMIC VERTICAL SECTIONS - ✅ Using normalized data */}
            <div className="space-y-12">
              {normalizedVerticals.map((section) => (
                <section key={section.id} className="px-4">
=======
            {/* 3. DYNAMIC VERTICALS (Curated Rows) */}
            <div className="space-y-10">
              {verticals.slice(0, 3).map((section) => (
                <section key={section.id} className="border-t border-gray-100 dark:border-white/5 pt-8 px-4">
>>>>>>> store_production_ready
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="text-xl font-black capitalize mb-1">{section.title}</h2>
                      <p className="text-xs text-gray-400 font-medium">Curated for you</p>
                    </div>
                    <Link href={`/main/store/category/${section.id}`} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x -mx-4 px-4">
                    {section.vendors.map((vendor) => (
<<<<<<< HEAD
                      <div key={vendor.id} className="min-w-[300px] snap-start">
=======
                      <div key={vendor.id} className="min-w-[280px] sm:min-w-[320px] snap-start relative group">
                        {/* Micro-Interaction: Heart Button Overlay */}
                        <button 
                          onClick={(e) => toggleFavorite(e, vendor.id)}
                          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Heart className={`w-4 h-4 ${favorites.includes(vendor.id) ? 'fill-red-500 text-red-500' : ''}`} />
                        </button>

>>>>>>> store_production_ready
                        <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                          <RestaurantCard 
                            {...vendor} 
                            banner={vendor.banner}
                            logo={vendor.logo}
                            time={vendor.deliveryTime || '30 min'} 
                          />
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

<<<<<<< HEAD
            {/* 4. INFINITE SCROLL: DISCOVER MORE - ✅ Using normalized data */}
            <section className="px-4 pb-12">
              <h2 className="text-2xl font-black mb-6">Discover More</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {normalizedStores.map((vendor) => (
                  <Link key={vendor.id} href={`/main/store/${vendor.slug || vendor.id}`}>
                    <RestaurantCard 
                      {...vendor} 
                      banner={vendor.banner}
                      logo={vendor.logo}
                      time={vendor.deliveryTime || '30 min'} 
                    />
                  </Link>
                ))}
=======
            {/* 4. DISCOVER MORE (Sticky Filters & Infinite Grid) */}
            <section className="relative min-h-screen pb-12">
              {/* Sticky Filter Header */}
              <div className="sticky top-[68px] z-20 bg-gray-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-4 py-3 mb-6 transition-all">
                 <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h2 className="text-lg font-black flex items-center gap-2">
                      <Store className="w-5 h-5 text-yellow-500" />
                      All Stores
                    </h2>
                    
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                       {[
                         { id: 'ALL', label: 'All', icon: null },
                         { id: 'RATING', label: 'Top Rated', icon: Star },
                         { id: 'FAST', label: 'Fastest', icon: Zap },
                         { id: 'OFFERS', label: 'Offers', icon: Percent },
                       ].map(f => (
                         <button 
                           key={f.id}
                           onClick={() => setFilter(f.id as any)}
                           className={`
                             px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all
                             ${filter === f.id 
                               ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' 
                               : 'bg-white dark:bg-[#151515] border border-gray-200 dark:border-white/10 text-gray-500 hover:border-yellow-500'}
                           `}
                         >
                           {f.icon && <f.icon className="w-3 h-3" />}
                           {f.label}
                         </button>
                       ))}
                    </div>
                 </div>
>>>>>>> store_production_ready
              </div>

              {/* Grid Content */}
              <div className="px-4">
                {filteredStores.length === 0 && !moreLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                    <ShoppingBasket className="w-12 h-12 mb-4 text-gray-300" />
                    <p className="text-sm font-bold">No stores found</p>
                    <p className="text-xs">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStores.map((vendor) => (
                      <div key={vendor.id} className="relative group">
                         <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                           {/* Vendor Badge Logic */}
                           {vendor.rating >= 4.8 && (
                             <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase tracking-wider rounded">
                               Top Rated
                             </div>
                           )}
                           <RestaurantCard {...vendor} time={vendor.deliveryTime || '30 min'} />
                         </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading Observer */}
                <div ref={observerTarget} className="h-24 flex items-center justify-center mt-12">
                  {moreLoading && <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />}
                  {!hasMore && stores.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                      End of list
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* =========================================
            SCENARIO 2: SEARCH RESULTS
           ========================================= */}
        {query && (
          <section className="px-4 pt-4 sm:pt-6">
             <div className="mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                <h1 className="text-2xl font-black mb-1">Results for "{query}"</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Found {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
                </p>
             </div>

             {searchResults.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <SearchX className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">No matches found</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                    We couldn't find any stores or items matching "{query}"
                  </p>
                  <Link 
                    href="/main/store" 
                    className="mt-6 px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                  >
                    Clear Search
                  </Link>
               </div>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {searchResults.map((vendor) => (
                    <div key={vendor.id} className="relative group">
                       <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                         {/* Optional Search Badges */}
                         {vendor.deliveryFee === 0 && (
                           <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-wider rounded">
                             Free Delivery
                           </div>
                         )}
                         <RestaurantCard {...vendor} time={vendor.deliveryTime || '30 min'} />
                       </Link>
                    </div>
                  ))}
               </div>
             )}
          </section>
        )}
      </main>

      <FloatingCart />
    </div>
  );
}