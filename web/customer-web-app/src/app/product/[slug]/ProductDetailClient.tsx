"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Plus, ShoppingCart } from "lucide-react";
import { ProductModal } from "@/store/ProductModal";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import BottomNav from "@/app/main/components/layout/BottomNav";

import type { Product } from "./types";
import { ImageGallery } from "./ImageGallery";
import { ProductInfo } from "./ProductInfo";
import { StoreCard } from "./StoreCard";
import { ProductCarousel, SidebarProductList } from "./ProductCarousel";

/* ─── Thin Orchestrator ───────────────────────────────────────────────────── */
export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const validImages = useMemo(
    () => (product.images ?? []).filter((u) => u?.startsWith("http")),
    [product.images],
  );

  const storeId = product.store?.id ?? "";

  const modalProduct = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    image: validImages[0],
    category: product.category ?? { name: "" },
    modifierGroups: product.modifierGroups ?? [],
  };

  const storeItemsEndpoint = `/marketplace/products/${product.slug}/store-items`;
  const relatedEndpoint = `/marketplace/products/${product.slug}/related`;
  const storeHref = product.store
    ? `/main/store/${product.store.slug ?? product.store.id}`
    : undefined;

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#111]/90 backdrop-blur border-b border-gray-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold truncate flex-1 text-sm sm:text-base">
            {product.name}
          </span>
          <button
            onClick={() => setModalOpen(true)}
            aria-label="Add to cart"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto pb-32">
        {/* Main 2-column grid */}
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:p-6">
          {/* LEFT column */}
          <div className="space-y-3">
            <ImageGallery images={validImages} productName={product.name} />
            <ProductInfo product={product} />

            {/* Mobile carousels — each self-fetches with its own skeleton */}
            <div className="lg:hidden space-y-4 px-4 py-2">
              <ProductCarousel title="More from this store" endpoint={storeItemsEndpoint} />
              <ProductCarousel title="You may also like" endpoint={relatedEndpoint} />
            </div>
          </div>

          {/* RIGHT sidebar — desktop only */}
          <div className="hidden lg:flex flex-col gap-4">
            {product.store && <StoreCard store={product.store} />}

            <div className="sticky top-20 space-y-3">
              {/* Add to Order card */}
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
                <div className="mb-3">
                  <span className="text-2xl font-black text-yellow-500">
                    ₦{product.price.toLocaleString()}
                  </span>
                  {product.stock !== undefined && product.stock < 10 && (
                    <p className="text-xs text-orange-500 mt-1">Only {product.stock} left</p>
                  )}
                </div>
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Add to Order
                  <Plus className="w-4 h-4" />
                </button>
                {storeHref && (
                  <a
                    href={storeHref}
                    className="mt-2 block text-center text-sm text-yellow-500 font-semibold py-2 hover:underline"
                  >
                    View all from this store →
                  </a>
                )}
              </div>

              {/* Sidebar compact lists — each self-fetches */}
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 space-y-4">
                <SidebarProductList title="More from this store" endpoint={storeItemsEndpoint} limit={4} />
                <SidebarProductList title="You may also like" endpoint={relatedEndpoint} limit={4} />
              </div>
            </div>
          </div>
        </div>

        {/* Full-width carousels below grid (desktop) */}
        <div className="hidden lg:block space-y-4 px-6 pb-6">
          <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
            <ProductCarousel title="More from this store" endpoint={storeItemsEndpoint} />
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
            <ProductCarousel title="Similar items you may like" endpoint={relatedEndpoint} />
          </div>
        </div>
      </div>

      {/* Mobile sticky Add to Order bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-4 pb-2">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold py-4 rounded-2xl transition-all shadow-xl shadow-yellow-500/20"
        >
          <ShoppingBag className="w-5 h-5" />
          Add to Order — ₦{product.price.toLocaleString()}
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <FloatingCart />
      <BottomNav />

      {modalOpen && (
        <ProductModal
          product={modalProduct}
          storeId={storeId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
