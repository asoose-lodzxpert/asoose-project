"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { Search, PenLine, X } from "lucide-react";
import { MenuTabs } from "@/app/main/components/restaurant/MenuTabs";
import { SidebarCart } from "@/app/main/components/restaurant/sidebarcart";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import BottomNav from "@/app/main/components/layout/BottomNav";
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
    } catch (e) { /* ignore */ }
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

  const handleReviewSubmit = async (
    _rating: number,
    _comment: string,
    _orderId?: string, // reserved for future backend support
  ) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-24">
      <main className="max-w-7xl mx-auto md:px-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <StoreHero
              name={store.name}
              image={store.image}
              rating={store.rating}
              type={store.type}
              time={store.deliveryTime}
              address={store.address}
              isAvailable={store.isAvailableInLocation}
            />

            <div className="space-y-6">
              {/* Search Input */}
              <div className="px-4 md:px-0">
                <div className="relative group">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
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
                    className="w-full bg-white dark:bg-[#151515] h-12 rounded-xl pl-12 pr-12 border border-gray-100 dark:border-white/5 focus:outline-none focus:border-yellow-500 transition-colors"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-3.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
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

              <div className="px-4 md:px-0 sticky top-0 z-20 bg-gray-50 dark:bg-[#0a0a0a] pt-2 pb-2">
                <MenuTabs
                  categories={categories}
                  activeTab={activeTab}
                  onSelect={setActiveTab}
                />
              </div>

              <div className="px-4 md:px-0 min-h-[300px]">
                <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-2">
                  {searchQuery ? "Search Results" : activeTab}{" "}
                  <span className="text-gray-400 text-base font-normal">
                    ({displayedItems.length})
                  </span>
                </h3>
                {displayedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                    <p>No items found.</p>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-gray-200 dark:border-white/5 mx-4 md:mx-0" />

            <div id="reviews" className="px-4 md:px-0">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">
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
      <BottomNav />

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
