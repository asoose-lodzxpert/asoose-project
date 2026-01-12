'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; 
import { HomeHeader } from '@/app/main/components/home/HomeHeader';
import { Search, Heart, Share2, MapPin, Clock, Star, ShoppingBag, PartyPopper, Loader2 } from 'lucide-react';
import { MenuTabs } from '@/app/main/components/restaurant/MenuTabs';
import { MenuItem } from '@/app/main/components/restaurant/MenuItem';
import { BottomNav } from '@/app/main/components/layout/BottomNav';
import { RestaurantHero } from '@/app/main/components/restaurant/RestaurantHero';
import { AppFooter } from '@/app/main/components/layout/AppFooter';
import { FloatingCart } from '@/app/main/components/home/FloatingCart';
import { SidebarCart } from '@/app/main/components/restaurant/sidebarcart';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function RestaurantPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("Popular");

  // Fetch Restaurant Data
  useEffect(() => {
    if (!restaurantId) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/marketplace/restaurant/${restaurantId}`);
        if (!res.ok) throw new Error('Failed to load');
        
        const data = await res.json();
        setRestaurant(data);
        setMenuItems(data.products);

        // Extract unique categories from products + add "Popular"
        const uniqueCats = Array.from(new Set(data.products.map((p: any) => p.category.name)));
        setCategories(["Popular", ...uniqueCats as string[]]);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]);

  // Filter Items based on Tab
  const displayedItems = activeTab === "Popular" 
    ? menuItems.slice(0, 5) // Just take first 5 as "Popular" for now
    : menuItems.filter(item => item.category.name === activeTab);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="w-8 h-8 animate-spin text-yellow-500"/></div>;
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center">Restaurant not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      
      <HomeHeader />

      <main className="max-w-7xl mx-auto md:px-6 md:py-8 pb-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Section */}
            <div className="md:rounded-3xl md:overflow-hidden shadow-sm">
               <RestaurantHero 
                  name={restaurant.name}
                  image={restaurant.image || "/hero-pizza.png"}
                  rating={restaurant.rating}
                  ratingCount={120} // Placeholder count
                  time={restaurant.deliveryTime}
                  deliveryFee="$2.99"
                  tags={categories.slice(1, 4)} // Show first 3 categories as tags
               />
            </div>

            {/* Mobile Actions */}
            <div className="flex gap-3 px-4 md:px-0">
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors">
                  <Search className="w-4 h-4" /> Search
               </button>
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors group">
                  <Heart className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" /> Favorite
               </button>
               <button className="flex-1 bg-white dark:bg-[#151515] h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-gray-100 dark:border-white/5 hover:bg-gray-50 transition-colors">
                  <Share2 className="w-4 h-4" /> Share
               </button>
            </div>

            {/* Menu Tabs */}
            <div className="px-4 md:px-0 sticky top-[70px] z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-2">
              <MenuTabs categories={categories} activeTab={activeTab} onSelect={setActiveTab} />
            </div>

            {/* Menu Grid */}
            <div className="px-4 md:px-0 space-y-6">
               <h3 className="text-xl font-black tracking-tight">{activeTab} Items</h3>
               
               {displayedItems.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {displayedItems.map((item) => (
                     <MenuItem 
                        key={item.id} 
                        id={item.id}
                        name={item.name}
                        description={item.description}
                        price={item.price}
                        image={item.image}
                        isPopular={false} // Can add logic later
                     />
                   ))}
                 </div>
               ) : (
                 <div className="py-10 text-center text-gray-400">No items in this category.</div>
               )}
            </div>
          </div>

          {/* --- RIGHT COLUMN (Sidebar) --- */}
          <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-24 space-y-6">
                
                {/* Info Card */}
                <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                   <h3 className="font-black text-lg mb-4">Restaurant Info</h3>
                   <div className="space-y-4">
                      <div className="flex items-start gap-3">
                         <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold">{restaurant.address}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold text-green-600">Open Now</p>
                            <p className="text-xs text-gray-500">Delivery: {restaurant.deliveryTime}</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-3">
                         <Star className="w-5 h-5 text-gray-400 mt-0.5" />
                         <div>
                            <p className="text-sm font-bold">{restaurant.rating} Rating</p>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Desktop Cart Summary */}
               <SidebarCart restaurantName={restaurant.name} />

             </div>
          </div>

        </div>
      </main>

      {/* Floating Cart (Mobile) */}
     <FloatingCart/>

      <BottomNav />
      <AppFooter />
    </div>
  );
}