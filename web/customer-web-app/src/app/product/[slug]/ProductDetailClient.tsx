"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ShoppingBag,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Store,
  Package,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { ProductModal, ModifierGroup } from "@/store/ProductModal";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import BottomNav from "@/app/main/components/layout/BottomNav";
import { ApiService } from "@/services/api.service";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Modifier {
  id: string;
  name: string;
  price: number;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category?: { id?: string; name: string };
  modifierGroups?: ModifierGroup[];
  store?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    rating?: number;
    ratingCount?: number;
    image?: string;
    logo?: string;
    address?: string;
    deliveryTime?: string;
  };
  stock?: number;
  salesCount?: number;
}

interface MiniProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: string[];
  category?: { name: string };
  store?: { id: string; name: string; slug: string };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function StarRating({
  rating,
  count,
  size = 14,
}: {
  rating: number;
  count?: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            style={{ width: size, height: size }}
            className={
              s <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200 dark:text-white/20"
            }
          />
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}

/* Mini card used in "More from store" and "Similar items" rows */
function MiniProductCard({ product }: { product: MiniProduct }) {
  const img = product.images?.[0];
  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex-shrink-0 w-40 sm:w-44 bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:border-yellow-500/40 transition-colors group"
    >
      <div className="relative w-full h-40 bg-gray-100 dark:bg-white/5">
        {img ? (
          <Image
            src={img}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            📦
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm line-clamp-2 leading-snug mb-1">
          {product.name}
        </p>
        {product.store && (
          <p className="text-[10px] text-gray-400 truncate mb-1">
            {product.store.name}
          </p>
        )}
        <p className="font-black text-yellow-500 text-sm">
          ₦{product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const [activeImg, setActiveImg] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [storeItems, setStoreItems] = useState<MiniProduct[]>([]);
  const [relatedItems, setRelatedItems] = useState<MiniProduct[]>([]);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Only use valid HTTP(S) images
  const images = (product.images ?? []).filter((u) => u?.startsWith("http"));

  const goTo = (idx: number) =>
    setActiveImg((idx + images.length) % images.length);
  const prevImg = () => goTo(activeImg - 1);
  const nextImg = () => goTo(activeImg + 1);

  const handleTouchStart = (e: React.TouchEvent) =>
    setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) dx < 0 ? nextImg() : prevImg();
    setTouchStartX(null);
  };

  const fetchSidebar = useCallback(async () => {
    try {
      const [si, ri] = await Promise.all([
        ApiService.get<MiniProduct[]>(
          `/marketplace/products/${product.slug}/store-items`
        ),
        ApiService.get<MiniProduct[]>(
          `/marketplace/products/${product.slug}/related`
        ),
      ]);
      setStoreItems(si || []);
      setRelatedItems(ri || []);
    } catch {
      /* silently fail — these are non-critical */
    }
  }, [product.slug]);

  useEffect(() => {
    fetchSidebar();
  }, [fetchSidebar]);

  const storeId = product.store?.id ?? "";

  const modalProduct = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    image: images[activeImg],
    category: product.category ?? { name: "" },
    modifierGroups: product.modifierGroups ?? [],
  };

  const hasModifiers = (product.modifierGroups ?? []).length > 0;
  const descTooLong =
    (product.description?.length ?? 0) > 200 && !descExpanded;

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
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
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto pb-32">
        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:p-6">
          {/* LEFT: Gallery + details */}
          <div className="space-y-3">
            {/* Image gallery */}
            <div className="bg-white dark:bg-[#151515] lg:rounded-2xl overflow-hidden">
              {/* ── Main image ───────────────────────────────────────────── */}
              <div
                className="relative w-full aspect-square bg-gray-100 dark:bg-white/5 select-none"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {images.length > 0 ? (
                  <Image
                    key={images[activeImg]}
                    src={images[activeImg]}
                    alt={`${product.name} – photo ${activeImg + 1}`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover transition-opacity duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-white/20">
                    <Package className="w-16 h-16" />
                    <span className="text-sm">No image</span>
                  </div>
                )}

                {/* Left / Right arrow navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImg}
                      aria-label="Previous image"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImg}
                      aria-label="Next image"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Counter badge */}
                    <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                      {activeImg + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>

              {/* ── Thumbnail strip ──────────────────────────────────────── */}
              {images.length > 1 && (
                <div className="flex gap-2 px-3 py-3 overflow-x-auto scrollbar-hide">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                        activeImg === i
                          ? "w-[72px] h-[72px] border-yellow-500 shadow-md shadow-yellow-500/25 opacity-100"
                          : "w-14 h-14 border-transparent opacity-55 hover:opacity-90 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} thumbnail ${i + 1}`}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product core info card */}
            <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5 space-y-3">
              {/* Category + Sales */}
              <div className="flex items-center gap-2 flex-wrap">
                {product.category && (
                  <span className="text-xs font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-2.5 py-0.5 rounded-full">
                    {product.category.name}
                  </span>
                )}
                {(product.salesCount ?? 0) > 0 && (
                  <span className="text-xs text-gray-400">
                    {product.salesCount?.toLocaleString()} sold
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-2xl font-black leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-yellow-500">
                  ₦{product.price.toLocaleString()}
                </span>
              </div>

              {/* Stock */}
              {product.stock !== undefined && (
                <p
                  className={`text-sm font-medium ${
                    product.stock === 0
                      ? "text-red-500"
                      : product.stock < 10
                        ? "text-orange-500"
                        : "text-green-500"
                  }`}
                >
                  {product.stock === 0
                    ? "Out of stock"
                    : product.stock < 10
                      ? `Only ${product.stock} left`
                      : "In stock"}
                </p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5">
                <h2 className="font-bold text-base mb-2">Product Details</h2>
                <p
                  className={`text-sm text-gray-500 dark:text-gray-400 leading-relaxed ${
                    descTooLong ? "line-clamp-4" : ""
                  }`}
                >
                  {product.description}
                </p>
                {(product.description?.length ?? 0) > 200 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2 flex items-center gap-1 text-yellow-500 text-sm font-semibold"
                  >
                    {descExpanded ? (
                      <>
                        Show less <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Read more <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Modifier groups */}
            {hasModifiers && (
              <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5 space-y-3">
                <h2 className="font-bold text-base">Customise your order</h2>
                <p className="text-xs text-gray-400">
                  Options are selected when you add to cart
                </p>
                <div className="space-y-3">
                  {product.modifierGroups!.map((group) => (
                    <div
                      key={group.id}
                      className="border border-gray-100 dark:border-white/5 rounded-xl p-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">
                          {group.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            group.minSelect > 0
                              ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                              : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {group.minSelect > 0 ? "Required" : "Optional"}
                          {group.maxSelect > 1
                            ? ` · up to ${group.maxSelect}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.modifiers.map((mod) => (
                          <span
                            key={mod.id}
                            className="text-xs bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5"
                          >
                            {mod.name}
                            {mod.price > 0 && (
                              <span className="text-yellow-500 font-semibold">
                                +₦{mod.price.toLocaleString()}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* More from this store — shown inline on mobile/tablet */}
            {storeItems.length > 0 && (
              <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5 lg:hidden">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold text-base">More from this store</h2>
                  {product.store && (
                    <Link
                      href={`/main/store/${product.store.slug ?? product.store.id}`}
                      className="text-xs text-yellow-500 font-semibold flex items-center gap-1"
                    >
                      See all <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {storeItems.map((p) => (
                    <MiniProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Related / Similar — shown inline on mobile/tablet */}
            {relatedItems.length > 0 && (
              <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5 lg:hidden">
                <h2 className="font-bold text-base mb-3">
                  Similar items you may like
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {relatedItems.map((p) => (
                    <MiniProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR — desktop only ─────────────────────────────── */}
          <div className="hidden lg:flex flex-col gap-4">
            {/* Store info card */}
            {product.store && (
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.store.logo || product.store.image ? (
                      <Image
                        src={(product.store.logo ?? product.store.image)!}
                        alt={product.store.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <Store className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {product.store.name}
                    </p>
                    {product.store.type && (
                      <p className="text-xs text-gray-400 capitalize">
                        {product.store.type.toLowerCase()}
                      </p>
                    )}
                    {(product.store.rating ?? 0) > 0 && (
                      <StarRating
                        rating={product.store.rating!}
                        count={product.store.ratingCount}
                        size={12}
                      />
                    )}
                  </div>
                </div>
                {product.store.address && (
                  <p className="text-xs text-gray-400 line-clamp-2">
                    📍 {product.store.address}
                  </p>
                )}
                <Link
                  href={`/main/store/${product.store.slug ?? product.store.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <Store className="w-4 h-4" />
                  Visit Store
                </Link>
              </div>
            )}

            {/* Add to order — sticky in sidebar on desktop */}
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 space-y-3 sticky top-20">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-yellow-500">
                  ₦{product.price.toLocaleString()}
                </span>
                {product.stock !== undefined && product.stock > 0 && (
                  <span className="text-xs text-green-500 font-medium">
                    In stock
                  </span>
                )}
              </div>
              {hasModifiers && (
                <p className="text-xs text-gray-400">
                  Customisation required — select options in cart
                </p>
              )}
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-colors text-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                Add to Order
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* More from store — desktop sidebar */}
            {storeItems.length > 0 && (
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-sm">More from this store</h2>
                  {product.store && (
                    <Link
                      href={`/main/store/${product.store.slug ?? product.store.id}`}
                      className="text-xs text-yellow-500 font-semibold flex items-center gap-1"
                    >
                      See all <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <div className="space-y-2">
                  {storeItems.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug">
                          {p.name}
                        </p>
                        <p className="text-xs font-black text-yellow-500 mt-0.5">
                          ₦{p.price.toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related items — desktop sidebar */}
            {relatedItems.length > 0 && (
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 space-y-3">
                <h2 className="font-bold text-sm">You may also like</h2>
                <div className="space-y-2">
                  {relatedItems.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.slug}`}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5">
                        {p.images?.[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold line-clamp-2 leading-snug">
                          {p.name}
                        </p>
                        <p className="text-xs font-black text-yellow-500 mt-0.5">
                          ₦{p.price.toLocaleString()}
                        </p>
                        {p.store && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {p.store.name}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Full-width sections below grid (desktop: more from store + related) ── */}
        <div className="hidden lg:block space-y-4 px-6 pb-6">
          {storeItems.length > 0 && (
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">More from this store</h2>
                {product.store && (
                  <Link
                    href={`/main/store/${product.store.slug ?? product.store.id}`}
                    className="text-sm text-yellow-500 font-semibold flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {storeItems.map((p) => (
                  <MiniProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {relatedItems.length > 0 && (
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
              <h2 className="font-bold text-lg mb-4">
                Similar items you may like
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {relatedItems.map((p) => (
                  <MiniProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky "Add to Order" bar — mobile only ───────────────────────── */}
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
