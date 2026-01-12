'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation'; 
import { Search, PenLine } from 'lucide-react';
import { MenuTabs } from '@/app/main/components/restaurant/MenuTabs'; 
import { SidebarCart } from '@/app/main/components/restaurant/sidebarcart';
import { FloatingCart } from '@/app/main/components/home/FloatingCart';
import  BottomNav  from '@/app/main/components/layout/BottomNav';
import { StoreHero } from '@/store/StoreHero';
import { ProductCard } from '@/store/ProductCard';
import { StoreReviews } from '@/store/StoreReviews';
import { ReviewModal } from '@/store/ReviewModal';
import { StoreDetailSkeleton } from './skeleton';
import Swal from 'sweetalert2';
import { createClient } from '../../../../../utils/supabase/client';
import { ProductModal,ModifierGroup } from '@/store/ProductModal';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const POPULAR_ITEMS_COUNT = 6;

// Types match backend response
interface Product {
  id: string;
  name: string;
  price: number;
  category: { name: string };
  image?: string;
  description: string;
  modifierGroups: ModifierGroup[]; 
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  rating: number;
  comment: string;
  date: string;
}

interface Store {
  id: string;
  name: string;
  image: string;
  rating: number;
  type: 'RESTAURANT' | 'STORE';
  deliveryTime: string;
  address: string;
  products: Product[];
  reviews: Review[];
}

export default function StorePage() {
  const params = useParams();
  const slugOrId = params.id as string;
  
  // Initialize Custom Supabase Client
  const supabase = createClient();
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]); 
  
  // UI States
  const [activeTab, setActiveTab] = useState("All");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null); // State for Product Modal
  
  // Auth & Edit States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<{ rating: number, comment: string } | undefined>(undefined);

  // Fetch User Session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  // Fetch Store Data
  const fetchStoreData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/marketplace/vendor/${slugOrId}`);
      
      if (!res.ok) {
        if (res.status === 404) throw new Error('Store not found');
        if (res.status >= 500) throw new Error('Server error. Please try again later.');
        throw new Error('Failed to load store data');
      }
      
      const data: Store = await res.json();
      setStore(data);
      setMenuItems(data.products || []);
      setReviews(data.reviews || []);

      if (loading) {
        const defaultTab = data.type === 'RESTAURANT' ? 'Popular' : 'All';
        setActiveTab(defaultTab);
      }

    } catch (err) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
         setError('Network connection failed');
      } else {
         setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [slugOrId, loading]);

  useEffect(() => {
    if (slugOrId) fetchStoreData();
  }, [slugOrId, fetchStoreData]);

  // Handlers
  const onEditReview = (review: Review) => {
    setReviewToEdit({ rating: review.rating, comment: review.comment });
    setIsReviewModalOpen(true);
  };

  const handleModalClose = () => {
    setIsReviewModalOpen(false);
    setTimeout(() => setReviewToEdit(undefined), 300);
  };

  const onDeleteReview = async () => {
    if (!store?.id) return;

    const result = await Swal.fire({
       title: 'Delete Review?',
       text: "Are you sure you want to delete your review?",
       icon: 'warning',
       showCancelButton: true,
       confirmButtonColor: '#d33',
       cancelButtonColor: '#3085d6',
       confirmButtonText: 'Yes, delete it!',
       background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
       color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
    });

    if (result.isConfirmed) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch(`${API_URL}/marketplace/reviews/${store.id}`, {
           method: 'DELETE',
           headers: {
             'Authorization': `Bearer ${session?.access_token}`
           }
        });

        if (!res.ok) throw new Error("Failed to delete");

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
        });

        fetchStoreData(); 

      } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not delete review',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
      }
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
       Swal.fire({
         icon: 'warning',
         title: 'Login Required',
         text: 'You must be logged in to write a review.',
         toast: true,
         position: 'top',
         showConfirmButton: false,
         timer: 3000,
         background: document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#fff',
         color: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
       });
       throw new Error("Not logged in");
    }

    const res = await fetch(`${API_URL}/marketplace/reviews`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({
         storeId: store?.id,
         rating,
         comment: comment.trim()
       })
    });

    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) {
       const errorData = await res.json().catch(() => ({}));
       throw new Error(errorData.message || 'Failed to submit review');
    }

    fetchStoreData();
  };

  // Memos
  const categories = useMemo(() => {
    if (!store) return [];
    const uniqueCats = Array.from(new Set(menuItems.map((p) => p.category.name)));
    const defaultTab = store.type === 'RESTAURANT' ? 'Popular' : 'All';
    return [defaultTab, ...uniqueCats];
  }, [menuItems, store]);

  const displayedItems = useMemo(() => {
    if (activeTab === "All") return menuItems;
    if (activeTab === "Popular") return menuItems.slice(0, POPULAR_ITEMS_COUNT);
    return menuItems.filter(item => item.category.name === activeTab);
  }, [activeTab, menuItems]);

  // Render States
  if (loading) return <StoreDetailSkeleton />;

  if (error || !store) {
    const isNotFound = error === 'Store not found';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4">
        <div className="text-center max-w-md">
          <div className="mb-4 flex justify-center">
             {isNotFound ? (
                <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-full flex items-center justify-center text-3xl">🏪</div>
             ) : (
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 text-3xl">⚠️</div>
             )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isNotFound ? 'Store Not Found' : 'Something went wrong'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isNotFound ? "The store you're looking for doesn't exist or has been removed." : error}
          </p>
          <div className="flex gap-3 justify-center">
           
             {!isNotFound && (
                <button onClick={() => { setLoading(true); fetchStoreData(); }} className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition flex items-center gap-2">
                  Try Again
                </button>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans pb-24 transition-colors duration-300">
      <main className="max-w-7xl mx-auto md:px-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
             <div className="md:rounded-3xl md:overflow-hidden shadow-sm">
                <StoreHero 
                   name={store.name}
                   image={store.image}
                   rating={store.rating}
                   type={store.type}
                   time={store.deliveryTime}
                   address={store.address}
                />
             </div>

             <div className="space-y-6">
                 <div className="px-4 md:px-0">
                    <div className="relative group">
                       <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
                       <input type="text" placeholder={`Search in ${store.name}...`} className="w-full bg-white dark:bg-[#151515] h-12 rounded-xl pl-12 pr-4 border border-gray-100 dark:border-white/5 focus:outline-none focus:border-yellow-500 transition-colors" />
                    </div>
                 </div>

                 <div className="px-4 md:px-0 sticky top-0 z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-2">
                    <MenuTabs categories={categories} activeTab={activeTab} onSelect={setActiveTab} />
                 </div>

                 <div className="px-4 md:px-0 min-h-[300px]">
                    <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
                        {activeTab} <span className="text-gray-400 text-base font-normal">({displayedItems.length})</span>
                    </h3>
                    {displayedItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {displayedItems.map((item) => (
                              <ProductCard 
                                key={item.id} 
                                {...item} 
                                storeId={store.id}
                                onClick={() => setSelectedProduct(item)} // <--- Open Modal Logic
                              />
                          ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                          <p>No items found in this category.</p>
                        </div>
                    )}
                 </div>
             </div>

             <hr className="border-gray-200 dark:border-white/5 mx-4 md:mx-0" />

             {/* Reviews Section */}
             <div id="reviews" className="px-4 md:px-0">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black">
                      Ratings & Reviews <span className="text-gray-400 text-lg ml-2">({reviews.length})</span>
                    </h2>
                    <button 
                        onClick={() => setIsReviewModalOpen(true)}
                        className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-bold text-sm hover:opacity-80 transition"
                    >
                        <PenLine className="w-4 h-4" /> Write Review
                    </button>
                </div>
                
                {/* REVIEWS LIST with Edit/Delete Props */}
                <StoreReviews 
                   reviews={reviews} 
                   currentUserId={currentUserId}
                   onEdit={onEditReview}
                   onDelete={onDeleteReview}
                />
             </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-8">
                <SidebarCart restaurantName={store.name} />
             </div>
          </div>
        </div>
      </main>

      <FloatingCart />
      <BottomNav />
      
      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          storeId={store?.id || ''} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {/* Review Modal with pre-filled data support */}
      <ReviewModal 
         isOpen={isReviewModalOpen} 
         onClose={handleModalClose} 
         onSubmit={handleReviewSubmit}
         initialData={reviewToEdit} 
      />
    </div>
  );
}