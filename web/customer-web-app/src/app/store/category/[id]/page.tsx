'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, SearchX, AlertCircle, SlidersHorizontal, 
  ChevronDown 
} from 'lucide-react';
import { HomeHeader } from '@/components/home/HomeHeader';
import { RestaurantCard } from '@/components/home/RestaurantCard';
import { AppFooter } from '@/components/layout/AppFooter';
import  BottomNav  from '@/components/layout/BottomNav';
import { FloatingCart } from '@/components/home/FloatingCart';
import { StoreSkeleton } from '@/app/store/skeleton';

// --- API CONFIGURATION ---
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

const DELIVERY_FEE = 500;

// --- TYPES ---
interface Vendor {
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

interface CategoryData {
  id: string;
  title: string;
  vendors: Vendor[];
}

// Define available filters
const FILTERS = ['All', 'Top Rated', 'Fastest Delivery', 'Low Delivery Fee'];

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CategoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for the active filter
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Fetching Category: ${categoryId} | Filter: ${activeFilter}`);
        
        // Construct URL with query param if filter is not 'All'
        let url = `${API_URL}/v1/api/marketplace/categories/${categoryId}`;
        if (activeFilter !== 'All') {
          // Map UI filter names to backend query params if needed
          // e.g. "Top Rated" -> "rating"
          // For now, we pass the exact string, assuming backend handles it
          url += `?filter=${encodeURIComponent(activeFilter)}`;
        }

        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
            if(res.status === 404) throw new Error('Category not found');
            throw new Error(`Failed to load category (${res.status})`);
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Category fetch error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    if (categoryId) {
      fetchCategory();
    }
    // Dependency array now includes activeFilter so it refetches on click
  }, [categoryId, activeFilter]);

  const formatTitle = (slug: string) => {
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  if (loading) return <StoreSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Category Unavailable</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      <HomeHeader />

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
             <Link href="/store" className="hover:text-yellow-500">Marketplace</Link>
             <ChevronDown className="w-3 h-3 -rotate-90" />
             <span className="text-gray-900 dark:text-white font-medium capitalize">{data?.title || categoryId}</span>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-black capitalize tracking-tight mb-2">
                {data?.title || formatTitle(categoryId)}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {data?.vendors.length || 0} stores near you
              </p>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
               <SlidersHorizontal className="w-4 h-4" />
               <span className="text-sm font-bold hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* --- FILTER CHIPS --- */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                  activeFilter === filter 
                    ? 'bg-yellow-500 text-white border-yellow-500 shadow-lg shadow-yellow-500/20' 
                    : 'bg-white dark:bg-[#151515] border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* --- VENDOR GRID --- */}
        {data && data.vendors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {data.vendors.map((vendor) => (
              <Link key={vendor.id} href={`/store/${vendor.slug || vendor.id}`}>
                <RestaurantCard
                  name={vendor.name}
                  image={vendor.image}
                  rating={vendor.rating}
                  time={vendor.deliveryTime || '30-45 min'}
                  deliveryFee={vendor.deliveryFee || DELIVERY_FEE}
                  tags={[vendor.type]}
                />
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-60">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <SearchX className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-1">No vendors found</h3>
            <p className="text-gray-500">
              We couldn't find any stores matching "{activeFilter}" in this category.
            </p>
            {activeFilter !== 'All' && (
              <button 
                onClick={() => setActiveFilter('All')}
                className="mt-4 text-yellow-500 font-bold hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </main>

      <FloatingCart />
      <BottomNav />
      <AppFooter />
    </div>
  );
}