"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Star, ShoppingBag, Plus } from "lucide-react";
import BottomNav from "@/app/main/components/layout/BottomNav";
import { FloatingCart } from "@/app/main/components/home/FloatingCart";
import { ProductModal, ModifierGroup } from "@/store/ProductModal";
import { ApiService } from "@/services/api.service";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images?: string[];
  image?: string;
  category?: { name: string };
  modifierGroups?: ModifierGroup[];
  store?: { id: string; name: string; slug?: string };
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-white/20"
          }`}
        />
      ))}
    </div>
  );
}

export default function MainProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeSlug = params.id as string;
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [storeRating, setStoreRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const prod = await ApiService.get<any>(`/marketplace/products/${productId}`);
        const normalised: Product = {
          ...prod,
          image:
            prod.image ||
            (Array.isArray(prod.images) && prod.images.length > 0
              ? prod.images[0]
              : undefined),
        };
        setProduct(normalised);

        // Fetch store info/reviews using the slug from URL (or store id from product)
        const storeId = prod.store?.id ?? storeSlug;
        const storeData = await ApiService.get<any>(`/marketplace/vendor/${storeId}`);
        setReviews(storeData.reviews || []);
        setStoreRating(storeData.rating ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load product");
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchData();
  }, [productId, storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-500 text-center">{error || "Product not found"}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  const heroImage = product.image || (product.images?.[0]);
  const extraImages = (product.images || []).slice(1);
  const storeId = product.store?.id ?? storeSlug;

  const modalProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.image,
    category: product.category ?? { name: "" },
    modifierGroups: product.modifierGroups ?? [],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-28">
      {/* Back button */}
      <div className="sticky top-0 z-30 bg-gray-50/80 dark:bg-[#0a0a0a]/80 backdrop-blur border-b border-gray-100 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold truncate">{product.name}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Product card */}
        <div className="bg-white dark:bg-[#151515] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden shadow-sm">
          {/* Hero image */}
          {heroImage && (
            <div className="relative w-full h-64 sm:h-80 bg-gray-100 dark:bg-white/5">
              <Image
                src={heroImage}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Category badge */}
            {product.category && (
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-1 rounded-full">
                {product.category.name}
              </span>
            )}

            <h1 className="text-2xl font-black leading-tight">{product.name}</h1>
            <p className="text-3xl font-black text-yellow-500">
              ₦{product.price.toLocaleString()}
            </p>

            {product.description && (
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Modifier groups preview */}
            {(product.modifierGroups ?? []).length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Customise
                </p>
                {product.modifierGroups!.map((group) => (
                  <div key={group.id} className="flex justify-between text-sm">
                    <span className="font-medium">{group.name}</span>
                    <span className="text-gray-400 text-xs">
                      {group.minSelect > 0 ? "Required" : "Optional"}
                      {group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Store link */}
            {product.store && (
              <div className="border-t border-gray-100 dark:border-white/5 pt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">From</span>
                <button
                  onClick={() => router.push(`/main/store/${storeSlug}`)}
                  className="text-sm font-bold text-yellow-500 hover:underline"
                >
                  {product.store.name}
                </button>
              </div>
            )}

            {/* Add to Order button */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Add to Order
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Extra images */}
        {extraImages.length > 0 && (
          <div>
            <h2 className="font-bold text-lg mb-3">More Photos</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {extraImages.map((img, i) => (
                <div
                  key={i}
                  className="relative w-36 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5"
                >
                  <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black">
              Store Reviews{" "}
              <span className="text-gray-400 font-normal text-base">({reviews.length})</span>
            </h2>
            {storeRating > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={storeRating} />
                <span className="font-bold text-sm">{storeRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="py-10 text-center text-gray-400 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
              <p className="text-sm">No reviews yet. Be the first to try it!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white dark:bg-[#151515] rounded-2xl p-4 border border-gray-100 dark:border-white/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 font-bold text-yellow-500 text-sm">
                      {review.userName?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{review.userName}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(review.date).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <StarRating rating={review.rating} />
                      {review.comment && (
                        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
