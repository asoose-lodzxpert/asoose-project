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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
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
  products: Product[];
  reviews: Review[];
}

export default function StorePage() {
  const params = useParams();
  const slugOrId = params.id as string;

  // Guard against reserved path segments that would otherwise fall into this
  // dynamic route (e.g. /main/store/categories hitting the vendor API).
  const RESERVED = ["categories", "category", "search", "favorites"];
  if (RESERVED.includes(slugOrId?.toLowerCase())) {
    if (typeof window !== "undefined") window.location.replace("/main/store");
    return null;
  }

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
  }, []);

  const fetchStoreData = useCallback(async () => {
    try {
      setError(null);
      const data = await ApiService.get<Store>(
        `/marketplace/vendor/${slugOrId}`,
      );
      // Normalise: API returns `images: string[]`; components expect `image: string`
      const normalizedProducts = (data.products || []).map((p: any) => ({
        ...p,
        image:
          p.image ||
          (Array.isArray(p.images) && p.images.length > 0
            ? p.images[0]
            : undefined),
      }));
      setStore({ ...data, products: normalizedProducts });
      setMenuItems(normalizedProducts);
      setReviews(data.reviews || []);

      // Set default tab on first load based on store type
      setActiveTab((prev) =>
        prev === "All" || prev === "Popular"
          ? data.type === "RESTAURANT"
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
      try {
        // ✅ Get NextAuth Session
        const session = await getSession();
        const token = (session as any)?.accessToken;

        await ApiService.delete(`/marketplace/reviews/${store.id}`, token);
        fetchStoreData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReviewSubmit = async (
    rating: number,
    comment: string,
    _orderId?: string, // reserved for future backend support
  ) => {
    // ✅ Get NextAuth Session
    const session = await getSession();
    const token = (session as any)?.accessToken;

    if (!token) throw new Error("Not logged in");

    await ApiService.post(
      "/marketplace/reviews",
      { storeId: store?.id, rating, comment: comment.trim() },
      token,
    );
    fetchStoreData();
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
                    className="w-full bg-white dark:bg-[#151515] h-12 rounded-xl pl-12 pr-12 border border-gray-100 dark:border-white/5 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-3.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
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
