"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import {
  ProductModal,
  type Product as ModalProduct,
  type ModifierGroup,
} from "@/store/ProductModal";

interface PublicProduct {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category?: { name: string };
  modifierGroups?: ModifierGroup[];
}

interface StorePageClientProps {
  storeId: string; // slug or id — used in the URL
  storeName: string;
  byCategory: Record<string, PublicProduct[]>;
  /** True when the store is open and accepting orders */
  isCurrentlyOpen?: boolean;
  closedReason?: string;
  closedMessage?: string;
}

// â”€â”€ Product card purpose-built for the public store page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Clicking the card body â†’ navigates to the product detail page.
// Clicking the "+" button â†’ opens the ProductModal (handles auth internally).
function PublicProductCard({
  product,
  storeId,
  onAddClick,
  storeClosed,
}: {
  product: PublicProduct;
  storeId: string;
  onAddClick: (p: PublicProduct) => void;
  storeClosed?: boolean;
}) {
  const image =
    product.image ??
    (Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : null);

  return (
    <article className="relative bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all group">
      {/* Card body â€” navigates to product detail page */}
      <Link
        href={
          product.slug
            ? `/product/${product.slug}`
            : `/stores/${storeId}/product/${product.id}`
        }
        className="flex gap-4 p-3"
        aria-label={`View ${product.name} details`}
      >
        {/* Image */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
          {image?.startsWith("http") ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="112px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              ðŸ“¦
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1 text-sm">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
          {/* Price + spacer for the "+" button */}
          <div className="flex items-end justify-between mt-2">
            <span className="font-black text-lg text-gray-900 dark:text-white">
              â‚¦{product.price.toLocaleString()}
            </span>
            {/* Spacer so price doesn't overlap the absolute button */}
            <span className="w-9" />
          </div>
        </div>
      </Link>

      {/* "+" button â€” stops propagation so it doesn't trigger navigation */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!storeClosed) onAddClick(product);
        }}
        disabled={storeClosed}
        title={
          storeClosed
            ? "Store is currently closed"
            : `Add ${product.name} to cart`
        }
        className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10 ${
          storeClosed
            ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-orange-500 hover:text-white"
        }`}
        aria-label={
          storeClosed ? "Store closed" : `Add ${product.name} to cart`
        }
      >
        <Plus className="w-4 h-4" />
      </button>
    </article>
  );
}

// â”€â”€ Main client wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function StorePageClient({
  storeId,
  storeName,
  byCategory,
  isCurrentlyOpen,
  closedReason,
  closedMessage,
}: StorePageClientProps) {
  const storeClosed = isCurrentlyOpen === false;
  const [activeProduct, setActiveProduct] = useState<ModalProduct | null>(null);

  const openModal = (p: PublicProduct) => {
    if (storeClosed) return; // guard
    setActiveProduct({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      image:
        p.image ??
        (Array.isArray(p.images) && p.images.length > 0
          ? p.images[0]
          : undefined),
      category: p.category ?? { name: "" },
      modifierGroups: p.modifierGroups ?? [],
    });
  };

  return (
    <>
      {/* ── Closed banner ──────────────────────────────────────────────── */}
      {storeClosed && (
        <div className="mb-6 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 p-4 flex items-start gap-3">
          <span className="text-2xl leading-none">
            {closedReason === "MANUAL_CLOSE" ? "🔴" : "🕐"}
          </span>
          <div>
            <p className="font-bold text-red-700 dark:text-red-400 text-sm">
              {closedReason === "MANUAL_CLOSE"
                ? "Store Temporarily Closed"
                : "Currently Outside Opening Hours"}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
              {closedMessage ||
                "This store is not accepting orders right now. Please check back later."}
            </p>
          </div>
        </div>
      )}
      {Object.keys(byCategory).length > 0 ? (
        Object.entries(byCategory).map(([category, products]) => (
          <div key={category} className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {products.map((p) => (
                <PublicProductCard
                  key={p.id}
                  product={p}
                  storeId={storeId}
                  onAddClick={openModal}
                  storeClosed={storeClosed}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-400 py-12">
          No products listed yet.
        </p>
      )}

      {/* ProductModal â€” handles auth check internally (redirects to sign-in) */}
      {activeProduct && (
        <ProductModal
          product={activeProduct}
          storeId={storeId}
          onClose={() => setActiveProduct(null)}
        />
      )}
    </>
  );
}
