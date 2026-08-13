"use client";

import Image from "next/image";
import Link from "next/link";
import { Store, Star } from "lucide-react";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  type?: string;
  rating?: number;
  ratingCount?: number;
  image?: string;
  logo?: string;
  address?: string;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3 h-3 ${
              s <= Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-200 dark:text-white/20"
            }`}
          />
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}

/** Sidebar store info card — renders immediately from product data, no fetch needed. */
export function StoreCard({ store }: { store: StoreInfo }) {
  const logoSrc = store.logo ?? store.image;
  const storeHref = `/main/store/${store.slug ?? store.id}`;

  return (
    <section className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5 dark:border-white/[0.07] dark:bg-[#151515]">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt={store.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          ) : (
            <Store className="w-6 h-6 text-yellow-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{store.name}</p>
          {store.type && (
            <p className="text-xs text-gray-400 capitalize">
              {store.type.toLowerCase()}
            </p>
          )}
          {(store.rating ?? 0) > 0 && (
            <StarRating rating={store.rating!} count={store.ratingCount} />
          )}
        </div>
      </div>

      {store.address && (
        <p className="text-xs text-gray-400 line-clamp-2">📍 {store.address}</p>
      )}

      <Link
        href={storeHref}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400 hover:bg-yellow-50 dark:border-white/10 dark:hover:bg-yellow-500/10"
      >
        <Store className="w-4 h-4" />
        Visit Store
      </Link>
    </section>
  );
}
