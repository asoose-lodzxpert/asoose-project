"use client";

import { useEffect, useState, useCallback, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { ApiService } from "@/services/api.service";
import {
  Store,
  ChevronRight,
  Utensils,
  Loader2,
  export default function StorePage() {
    return (
      <Suspense fallback={null}>
        <StorePageContent />
      </Suspense>
    );
  }

  function StorePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get("q")?.trim() || null;

    // Data
    const {
      verticals,
      banners,
      searchResults,
      loading: initialLoading,
      fetchData,
    } = useStoreData(query);

    // UI State
    const [activeBannerIndex, setActiveBannerIndex] = useState(0);
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
      fetchData(query);
    }, [query, fetchData]);

    // Banner Carousel Logic
    useEffect(() => {
      if (banners.length <= 1) return;
      const interval = setInterval(() => {
        setActiveBannerIndex((prev) => (prev + 1) % banners.length);
      }, 6000);
      return () => clearInterval(interval);
    }, [banners.length]);

    // Toggle Favorite
    const toggleFavorite = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setFavorites((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    };

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
                  <div
                    className={`
                    w-full h-[180px] xs:h-[200px] sm:h-56 md:h-64 
                    rounded-3xl sm:rounded-[2rem] 
                    relative overflow-hidden flex items-center 
                    px-6 sm:px-12 shadow-xl transition-all duration-500 ease-in-out
                    ${activeBanner.type === "AD" ? "bg-indigo-900" : "bg-gradient-to-r from-yellow-500 to-orange-600"}
                  `}
                  >
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
                        {activeBanner.type === "AD" ? "Sponsored" : "Featured"}
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
                          className={`w-2 h-2 rounded-full transition-all ${idx === activeBannerIndex ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"}`}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* 2. CATEGORY RAIL */}
              <section className="px-4">
                <div className="flex justify-between items-center mb-4 px-1">
                  <h2 className="text-lg font-bold">Categories</h2>
                  <Link
                    href="/main/store/categories"
                    className="text-yellow-600 dark:text-yellow-500 text-xs font-bold hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-6 lg:grid-cols-8">
                  {verticals.map((v) => (
                    <Link
                      key={v.id}
                      href={`/main/store/category/${v.id}`}
                      className="min-w-[72px] snap-start flex flex-col items-center gap-2 group cursor-pointer"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 transition-all shadow-sm">
                        {getCategoryIcon(v.title)}
                      </div>
                      <span className="text-[11px] sm:text-xs font-bold text-center truncate w-full text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors capitalize">
                        {v.title}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* 3. DYNAMIC VERTICALS */}
              <div className="space-y-10">
                {verticals.map((section) => (
                  <section
                    key={section.id}
                    className="border-t border-gray-100 dark:border-white/5 pt-8 px-4"
                  >
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h2 className="text-xl font-black capitalize mb-1">
                          {section.title}
                        </h2>
                        <p className="text-xs text-gray-400 font-medium">
                          Curated for you
                        </p>
                      </div>
                      <Link
                        href={`/main/store/category/${section.id}`}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x -mx-4 px-4">
                      {section.vendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="min-w-[280px] sm:min-w-[320px] snap-start relative group"
                        >
                          <button
                            onClick={(e) => toggleFavorite(e, vendor.id)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Heart
                              className={`w-4 h-4 ${favorites.includes(vendor.id) ? "fill-red-500 text-red-500" : ""}`}
                            />
                          </button>

                          <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                            <RestaurantCard
                              {...vendor}
                              time={vendor.deliveryTime || "30 min"}
                            />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}

          {/* =========================================
              SCENARIO 2: SEARCH RESULTS (FIXED)
             ========================================= */}
          {query && searchResults && (
            <section className="px-4 pt-4 sm:pt-6">
              <div className="mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                <h1 className="text-2xl font-black mb-1">
                  Results for "{query}"
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Found {searchResults.stores.length} stores and{" "}
                  {searchResults.products.length} items
                </p>
              </div>

              {/* EMPTY STATE */}
              {searchResults.stores.length === 0 &&
                searchResults.products.length === 0 && (
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
                )}

              {/* STORES GRID */}
              {searchResults.stores.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5" /> Matching Stores
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {searchResults.stores.map((vendor) => (
                      <div key={vendor.id} className="relative group">
                        <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                          <RestaurantCard
                            {...vendor}
                            time={vendor.deliveryTime || "30 min"}
                          />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUCTS GRID */}
              {searchResults.products.length > 0 && (
                <div className="mb-12">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" /> Matching Items
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                    {searchResults.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        {...product}
                        onClick={() =>
                          router.push(`/main/store/${product.storeId}`)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>

        <FloatingCart />
      </div>
    );
  }
                  </div>
                )}
              </section>
            )}

            {/* 2. CATEGORY RAIL */}
            <section className="px-4">
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="text-lg font-bold">Categories</h2>
                <Link
                  href="/main/store/categories"
                  className="text-yellow-600 dark:text-yellow-500 text-xs font-bold hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-6 lg:grid-cols-8">
                {verticals.map((v) => (
                  <Link
                    key={v.id}
                    href={`/main/store/category/${v.id}`}
                    className="min-w-[72px] snap-start flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400 group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 transition-all shadow-sm">
                      {getCategoryIcon(v.title)}
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold text-center truncate w-full text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors capitalize">
                      {v.title}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {/* 3. DYNAMIC VERTICALS */}
            <div className="space-y-10">
              {verticals.map((section) => (
                <section
                  key={section.id}
                  className="border-t border-gray-100 dark:border-white/5 pt-8 px-4"
                >
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="text-xl font-black capitalize mb-1">
                        {section.title}
                      </h2>
                      <p className="text-xs text-gray-400 font-medium">
                        Curated for you
                      </p>
                    </div>
                    <Link
                      href={`/main/store/category/${section.id}`}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x -mx-4 px-4">
                    {section.vendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="min-w-[280px] sm:min-w-[320px] snap-start relative group"
                      >
                        <button
                          onClick={(e) => toggleFavorite(e, vendor.id)}
                          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Heart
                            className={`w-4 h-4 ${favorites.includes(vendor.id) ? "fill-red-500 text-red-500" : ""}`}
                          />
                        </button>

                        <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                          <RestaurantCard
                            {...vendor}
                            time={vendor.deliveryTime || "30 min"}
                          />
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {/* =========================================
            SCENARIO 2: SEARCH RESULTS (FIXED)
           ========================================= */}
        {query && searchResults && (
          <section className="px-4 pt-4 sm:pt-6">
            <div className="mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
              <h1 className="text-2xl font-black mb-1">
                Results for "{query}"
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Found {searchResults.stores.length} stores and{" "}
                {searchResults.products.length} items
              </p>
            </div>

            {/* EMPTY STATE */}
            {searchResults.stores.length === 0 &&
              searchResults.products.length === 0 && (
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
              )}

            {/* STORES GRID */}
            {searchResults.stores.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5" /> Matching Stores
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                  {searchResults.stores.map((vendor) => (
                    <div key={vendor.id} className="relative group">
                      <Link href={`/main/store/${vendor.slug || vendor.id}`}>
                        <RestaurantCard
                          {...vendor}
                          time={vendor.deliveryTime || "30 min"}
                        />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRODUCTS GRID */}
            {searchResults.products.length > 0 && (
              <div className="mb-12">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Matching Items
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                  {searchResults.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      {...product}
                      onClick={() =>
                        router.push(`/main/store/${product.storeId}`)
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <FloatingCart />
    </div>
  );
}
