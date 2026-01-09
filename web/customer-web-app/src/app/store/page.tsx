'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Loader2, ChevronRight, Utensils, ShoppingBasket, 
  Pill, Store, Bike, SearchX, AlertCircle, X 
} from 'lucide-react';
import { HomeHeader } from '@/components/home/HomeHeader';
import { CategoryScroll } from '@/components/home/CategoryScroll';
import { RestaurantCard } from '@/components/home/RestaurantCard';
import { AppFooter } from '@/components/layout/AppFooter';
import { FloatingCart } from '@/components/home/FloatingCart';
import { StoreSkeleton } from './skeleton';
import BottomNav from '@/components/layout/BottomNav';

// --- CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE_URL.replace(/\/$/, ''); // Ensure no trailing slash
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 400; // ms
const DELIVERY_FEE = 500;

// --- TYPES ---
interface Category {
  id: string;
  name: string;
  image: string;
}

interface BaseEntity {
  id: string;
  name: string;
  image?: string;
  slug?: string;
}

interface Vendor extends BaseEntity {
  rating: number;
  deliveryTime?: string;
  deliveryFee: number;
  prepTime?: number;
  type: string;
}

interface Product extends BaseEntity {
  price: number;
  store: {
    id: string;
    name: string;
    slug?: string;
  };
}

interface VerticalSection {
  id: string;
  type: string;
  slug: string;
  title: string;
  categories: Category[];
  vendors: Vendor[];
}

interface SearchResults {
  stores: Vendor[];
  products: Product[];
}

interface QuickLink {
  id: string;
  title: string;
  type: string;
  url: string;
}

interface CacheEntry {
  data: SearchResults | VerticalSection[];
  timestamp: number;
}

// --- CONSTANTS ---
const SERVICE_ICONS: Record<string, React.ElementType> = {
  RESTAURANT: Utensils,
  GROCERY: ShoppingBasket,
  PHARMACY: Pill,
  MARKET: Store,
};

const SERVICE_COLORS: Record<string, string> = {
  RESTAURANT: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  GROCERY: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  PHARMACY: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  MARKET: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
};

// --- HOOKS ---

/**
 * Debounces a value to prevent rapid updates
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Manages data fetching, caching, and state for the store page
 */
function useStoreData(searchQuery: string | null) {
  const [data, setData] = useState<{
    verticals: VerticalSection[];
    searchResults: SearchResults | null;
  }>({ verticals: [], searchResults: null });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (query: string | null) => {
    // 1. Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // 2. Check Cache
    const cacheKey = query ? `search:${query}` : 'home';
    const cachedEntry = cacheRef.current.get(cacheKey);
    const isCacheValid = cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION);

    if (isCacheValid) {
      if (query) {
        setData({ verticals: [], searchResults: cachedEntry.data as SearchResults });
      } else {
        setData({ verticals: cachedEntry.data as VerticalSection[], searchResults: null });
      }
      setLoading(false);
      return;
    }

    // 3. Set Loading
    setLoading(true);
    setError(null);

    try {
      const endpoint = query 
        ? `/v1/api/marketplace/search?q=${encodeURIComponent(query)}`
        : `/v1/api/marketplace/home`;

      const res = await fetch(`${API_URL}${endpoint}`, { 
        headers: { 'Content-Type': 'application/json' },
        signal 
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const responseData = await res.json();

      // 4. Update State & Cache
      if (query) {
        const results = responseData as SearchResults;
        cacheRef.current.set(cacheKey, { data: results, timestamp: Date.now() });
        setData({ verticals: [], searchResults: results });
      } else {
        const verticals = responseData.verticals || [];
        cacheRef.current.set(cacheKey, { data: verticals, timestamp: Date.now() });
        setData({ verticals, searchResults: null });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  return { ...data, loading, error, fetchData };
}

// --- COMPONENTS ---

export default function StorePage() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('q');
  
  // Sanitize query to avoid UI breaks
  const query = useMemo(() => 
    rawQuery ? rawQuery.replace(/[<>]/g, '').trim().slice(0, 100) : null
  , [rawQuery]);

  // Debounce the query string directly
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);
  
  const { verticals, searchResults, loading, error, fetchData } = useStoreData(debouncedQuery);
  const [showBanner, setShowBanner] = useState(true);

  // Trigger fetch only when debounced query changes
  useEffect(() => {
    fetchData(debouncedQuery);
  }, [debouncedQuery, fetchData]);

  // Derived state
  const isSearching = !!query;
  const totalResults = searchResults ? (searchResults.stores.length + searchResults.products.length) : 0;

  const quickLinks: QuickLink[] = useMemo(() => 
    verticals.map(v => ({
      id: v.id,
      title: v.title,
      type: v.type,
      url: `/store/category/${v.id}`, 
    }))
  , [verticals]);

  // Helper for image fallbacks
  const getSafeImage = (src?: string) => src || '/placeholder-store.jpg';

  if (loading && !isSearching && verticals.length === 0) return <StoreSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
        <HomeHeader />
        <main className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold">Unable to load content</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-colors"
          >
            Try Again
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      <HomeHeader />

      <main className="max-w-7xl mx-auto space-y-8 min-h-[60vh]">
        
        {/* --- SEARCH RESULTS VIEW --- */}
        {query && (
          <div className="px-4 pt-6 space-y-8">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-black">
                {loading ? (
                  <span className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Searching...
                  </span>
                ) : (
                  `Results for "${query}"`
                )}
              </h1>
              {!loading && (
                <span className="text-sm text-gray-500">({totalResults} found)</span>
              )}
            </div>

            {/* Empty State */}
            {!loading && searchResults && totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <SearchX className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search terms</p>
              </div>
            )}

            {/* Loading Skeleton for Search */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-[#151515] rounded-2xl p-4 animate-pulse">
                    <div className="aspect-video bg-gray-200 dark:bg-white/10 rounded-xl mb-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Vendors List */}
            {!loading && searchResults && searchResults.stores.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-yellow-500" /> Vendors
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.stores.map((store) => (
                    <Link key={store.id} href={`/store/${store.slug || store.id}`}>
                      <RestaurantCard
                        name={store.name}
                        image={store.image}
                        rating={store.rating}
                        time={store.prepTime ? `${store.prepTime} min` : '30-45 min'}
                        deliveryFee={DELIVERY_FEE}
                        tags={[store.type]}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}
            
            {/* Products List */}
            {!loading && searchResults && searchResults.products.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShoppingBasket className="w-5 h-5 text-green-500" /> Items
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/store/${product.store.slug || product.store.id}`}
                      className="block group bg-white dark:bg-[#151515] rounded-2xl p-3 border border-gray-100 dark:border-white/5 hover:border-yellow-500/50 transition-all"
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-white/5 rounded-xl mb-3 overflow-hidden relative">
                        <Image
                          src={getSafeImage(product.image)}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 mb-1 truncate">{product.store?.name}</p>
                        <p className="text-sm font-black text-yellow-600">₦{product.price.toLocaleString()}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* --- DEFAULT HOME VIEW --- */}
        {!query && (
          <>
            {/* 1. Promotional Banner */}
            {showBanner && (
              <section className="px-4 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-full h-40 sm:h-48 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl relative overflow-hidden flex items-center px-6 sm:px-10 shadow-lg shadow-orange-500/20 group">
                  <button 
                    onClick={(e) => { e.preventDefault(); setShowBanner(false); }}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="relative z-10 text-white transition-transform duration-500 group-hover:translate-x-2">
                    <h2 className="text-2xl sm:text-3xl font-black mb-2">Free Delivery</h2>
                    <p className="font-medium opacity-90 mb-4">On your first grocery order!</p>
                    <button className="bg-white text-orange-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-orange-50 transition-colors">
                      Order Now
                    </button>
                  </div>
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute right-10 top-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
                  <Bike className="absolute right-8 bottom-8 w-24 h-24 text-white/20 -rotate-12" />
                </div>
              </section>
            )}

            {/* 2. Quick Access Grid */}
            <section className="px-4">
              <h2 className="text-lg font-bold mb-4 px-1">Shop by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {quickLinks.map((link) => {
                  const Icon = SERVICE_ICONS[link.type] || Store;
                  const colorClass = SERVICE_COLORS[link.type] || 'text-gray-600 bg-gray-100 dark:bg-gray-800';
                  return (
                    <Link
                      key={link.id}
                      href={link.url}
                      className="flex flex-col items-center gap-3 group cursor-pointer p-4 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-yellow-500/30 transition-all duration-300"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} transition-transform group-hover:scale-110`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-center text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {link.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 3. Verticals */}
            <div className="space-y-12 pb-8">
              {verticals.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <div className="px-4 flex justify-between items-end mb-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                        {section.title}
                      </h2>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">Top rated near you</p>
                    </div>
                    <Link
                      href={`/store/category/${section.id}`} 
                      className="flex items-center gap-1 text-sm font-bold text-yellow-600 dark:text-yellow-500 hover:opacity-80 transition-opacity bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full"
                    >
                      See all <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="mb-6">
                    <CategoryScroll categories={(section.categories || []).map(c => c.name)} verticalId={section.id} />
                  </div>

                  <div className="flex gap-4 overflow-x-auto px-4 pb-6 scrollbar-hide snap-x">
                    {(section.vendors || []).length > 0 ? (
                      section.vendors.map((vendor) => (
                        <div key={vendor.id} className="min-w-[280px] sm:min-w-[320px] snap-center">
                          <Link href={`/store/${vendor.slug || vendor.id}`}>
                            <RestaurantCard
                              name={vendor.name}
                              image={vendor.image}
                              rating={vendor.rating}
                              time={vendor.deliveryTime || '30-45 min'}
                              deliveryFee={vendor.deliveryFee}
                              tags={['Popular']}
                            />
                          </Link>
                        </div>
                      ))
                    ) : (
                      <div className="w-full py-8 text-center text-gray-400 text-sm italic bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                        No vendors currently available in this category.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      <FloatingCart />
      <BottomNav />
      <AppFooter />
    </div>
  );
}