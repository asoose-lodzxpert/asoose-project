"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Search, PenLine, X } from "lucide-react";
import { MenuTabs } from "@/app/main/components/restaurant/MenuTabs";
import { SidebarCart } from "@/app/main/components/restaurant/sidebarcart";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import { StoreHero } from "@/store/StoreHero";
import { ProductCard } from "@/store/ProductCard";
import { StoreReviews } from "@/store/StoreReviews";
import { ReviewModal } from "@/store/ReviewModal";
import { StoreDetailSkeleton } from "./skeleton";
import Swal from "sweetalert2";
import { getSession } from "next-auth/react"; // ✅ Import NextAuth
import { ProductModal, ModifierGroup } from "@/store/ProductModal";
import { ApiService } from "@/services/api.service";
import { useRideStore } from "@/app/main/ride/store/ride";

const POPULAR_ITEMS_COUNT = 6;

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: { name: string };
  image?: string;
  /** Backend may return singular `image` or plural `images[]` — both are normalised to `image` at fetch time */
  images?: string[];
  description: string;
  modifierGroups: ModifierGroup[];
  stock?: number;
  status?: string;
  manageStock?: boolean;
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
  type: "RESTAURANT" | "STORE";
  deliveryTime: string;
  address: string;
  isAvailableInLocation?: boolean;
  products: Product[];
  reviews: Review[];
}

export default function StoreClient() {
  const params = useParams();
  const slugOrId = params.id as string;

  // Guard against reserved path segments that would otherwise fall into this
  // dynamic route (e.g. /main/store/categories hitting the vendor API).
  const RESERVED = ["categories", "category", "search", "favorites"];
  const isReserved = RESERVED.includes(slugOrId?.toLowerCase());

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Auth & Edit States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewToEdit, setReviewToEdit] = useState<
    { rating: number; comment: string } | undefined
  >(undefined);

  useEffect(() => {
    // ✅ Retrieve user ID from NextAuth session
    getSession().then((session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });

    // Load recent searches
    try {
      const saved = localStorage.getItem("asoose_recent_store_searches");
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const fetchStoreData = useCallback(async () => {
    try {
      setError(null);
      const userLocation = useRideStore.getState().userLocation;
      const locQuery = userLocation
        ? `?lat=${userLocation.lat}&lng=${userLocation.lng}`
        : "";

      const [detail, items] = await Promise.all([
        ApiService.get<any>(`/catalog/storefronts/${slugOrId}${locQuery}`),
        ApiService.get<any>(`/catalog/storefronts/${slugOrId}/items?limit=100`),
      ]);

      // Backend splits detail (name/rating/hours) from items (products, or a
      // menu grouped by category for restaurants) — flatten both into the
      // single flat product list this UI already expects.
      let normalizedProducts: Product[] = [];
      if (items?.kind === "RESTAURANT" && items.menu) {
        normalizedProducts = Object.entries(items.menu as Record<string, any[]>).flatMap(
          ([categoryName, dishes]) =>
            dishes.map((d: any) => ({
              ...d,
              category: { name: categoryName },
              image: d.image || (Array.isArray(d.images) && d.images[0]) || undefined,
            })),
        );
      } else if (items?.kind === "STORE" && items.products) {
        normalizedProducts = items.products.map((p: any) => ({
          ...p,
          category: { name: "All" },
          image: p.image || (Array.isArray(p.images) && p.images[0]) || undefined,
          stock: p.stock,
          status: p.status,
          manageStock: p.manageStock,
        }));
      }

      const mappedStore: Store = {
        id: detail.id,
        name: detail.name,
        image: detail.logo || detail.banner,
        rating: detail.rating,
        type: detail.kind,
        deliveryTime: `${detail.preparationTime || 20} min`,
        address: detail.address,
        isAvailableInLocation: detail.isOpen,
        products: normalizedProducts,
        reviews: [],
      };

      setStore(mappedStore);
      setMenuItems(normalizedProducts);
      // Reviews live under a separate module not yet wired up here — the UI
      // stays functional (empty state) rather than erroring.
      setReviews([]);

      // Set default tab on first load based on store type
      setActiveTab((prev) =>
        prev === "All" || prev === "Popular"
          ? mappedStore.type === "RESTAURANT"
            ? "Popular"
            : "All"
          : prev,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, [slugOrId]);

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
      title: "Delete Review?",
      text: "Are you sure you want to delete your review?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      // Reviews aren't wired to a backend endpoint yet — see handleReviewSubmit.
      Swal.fire("Coming soon", "Review management isn't available yet.", "info");
    }
  };

  const handleReviewSubmit = async () => {
    // TODO: wire up once the /reviews module's request/response contract is
    // confirmed — this UI already renders an empty review list gracefully.
    throw new Error("Reviews aren't available yet — check back soon.");
  };

  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      localStorage.setItem("asoose_recent_store_searches", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRecentSelect = (term: string) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setIsSearchFocused(false);
  };

  const categories = useMemo(() => {
    if (!store) return [];
    const uniqueCats = Array.from(
      new Set(menuItems.map((p) => p.category.name)),
    );
    const defaultTab = store.type === "RESTAURANT" ? "Popular" : "All";
    return [defaultTab, ...uniqueCats];
  }, [menuItems, store]);

  const displayedItems = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.name.toLowerCase().includes(query),
      );
    }

    if (activeTab === "Popular") return menuItems.slice(0, POPULAR_ITEMS_COUNT);
    if (activeTab === "All") return menuItems;
    return menuItems.filter((item) => item.category.name === activeTab);
  }, [activeTab, menuItems, searchQuery]);

  if (isReserved) {
    if (typeof window !== "undefined") window.location.replace("/main/store");
    return null;
  }

  if (loading) return <StoreDetailSkeleton />;

  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4">
        <h2 className="text-2xl font-bold mb-2">
          {error || "Something went wrong"}
        </h2>
        <button
          onClick={() => {
            setLoading(true);
            fetchStoreData();
          }}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] pb-28 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-100">
      <main className="mx-auto max-w-7xl md:px-6 md:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-7 lg:col-span-2 lg:space-y-8">
            <StoreHero
              name={store.name}
              image={store.image}
              rating={store.rating}
              type={store.type}
              time={store.deliveryTime}
              address={store.address}
              isAvailable={store.isAvailableInLocation}
            />

            <div className="space-y-5 sm:space-y-6">
              {/* Search Input */}
              <div className="px-4 md:px-0">
                <div className="relative group">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-yellow-500" />
                  <input
                    type="text"
                    placeholder={`Search in ${store.name}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addRecentSearch(searchQuery);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="h-12 w-full rounded-2xl border border-black/[0.06] bg-white pl-12 pr-12 text-sm font-medium shadow-sm transition-colors placeholder:text-gray-400 focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-500/10 dark:border-white/[0.07] dark:bg-[#151515]"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
                      aria-label="Clear store search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  {/* Recent Searches Pills */}
                  {isSearchFocused && recentSearches.length > 0 && (
                    <div 
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 rounded-xl p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2"
                    >
                      {(() => {
                        const suggestions = searchQuery.trim()
                          ? recentSearches.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10)
                          : recentSearches.slice(0, 10);
                        
                        if (suggestions.length === 0) return <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No suggestions</div>;

                        return (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {searchQuery.trim() ? "Search Suggestions" : "Recent Searches"}
                              </div>
                              <button 
                                onClick={() => {
                                  setRecentSearches([]);
                                  localStorage.removeItem("asoose_recent_store_searches");
                                }}
                                className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.map((term) => (
                                <button
                                  key={term}
                                  onClick={() => handleRecentSelect(term)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky top-[64px] z-20 border-y border-black/[0.04] bg-[#f7f7f5]/95 px-4 py-2 backdrop-blur-xl md:px-0 dark:border-white/5 dark:bg-[#0a0a0a]/95">
                <MenuTabs
                  categories={categories}
                  activeTab={activeTab}
                  onSelect={setActiveTab}
                />
              </div>

              <div className="min-h-[300px] px-4 md:px-0">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
                  {searchQuery ? "Search Results" : activeTab}{" "}
                  <span className="text-gray-400 text-base font-normal">
                    ({displayedItems.length})
                  </span>
                </h3>
                {displayedItems.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {displayedItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        {...item}
                        storeId={store.id}
                        kind={store.type === "RESTAURANT" ? "DISH" : "PRODUCT"}
                        isAvailable={store.isAvailableInLocation}
                        isSoldOut={item.manageStock && ((item.stock || 0) <= 0 || item.status === "OUT_OF_STOCK")}
                        href={
                          item.slug
                            ? `/product/${item.slug}`
                            : `/main/store/${slugOrId}/product/${item.id}`
                        }
                        onClick={() => setSelectedProduct(item)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 px-4 py-14 text-center text-gray-400 dark:border-white/10 dark:bg-white/[0.02]">
                    <Search className="mx-auto mb-3 h-7 w-7 opacity-50" />
                    <p className="font-semibold">No items found</p>
                    <p className="mt-1 text-xs">Try a different search or category.</p>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-white/5 mx-4 md:mx-0" />

            <div id="reviews" className="px-4 pb-4 md:px-0 md:pb-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
                <h2 className="text-xl font-black sm:text-2xl">
                  Ratings & Reviews{" "}
                  <span className="text-gray-400 text-lg ml-2">
                    ({reviews.length})
                  </span>
                </h2>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="flex items-center gap-1.5 md:gap-2 bg-gray-900 dark:bg-white text-white dark:text-black px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-transform active:scale-95 shadow-sm"
                >
                  <PenLine className="w-3.5 h-3.5 md:w-4 md:h-4" /> Write Review
                </button>
              </div>
              <StoreReviews
                reviews={reviews}
                currentUserId={currentUserId}
                onEdit={onEditReview}
                onDelete={onDeleteReview}
              />
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8">
              <SidebarCart restaurantName={store.name} />
            </div>
          </div>
        </div>
      </main>

      <FloatingCart />
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          storeId={store?.id || ""}
          kind={store?.type === "RESTAURANT" ? "DISH" : "PRODUCT"}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleModalClose}
        onSubmit={handleReviewSubmit}
        initialData={reviewToEdit}
      />
    </div>
  );
}
