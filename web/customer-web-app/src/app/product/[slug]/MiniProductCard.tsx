import Image from "next/image";
import Link from "next/link";
import type { MiniProduct } from "./types";

/** Horizontal card used in "More from store" and "Similar items" carousels. */
export function MiniProductCard({ product }: { product: MiniProduct }) {
  const img = product.images?.find((u) => u?.startsWith("http"));
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group w-40 flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-yellow-500/40 sm:w-44 dark:border-white/[0.07] dark:bg-[#151515]"
    >
      <div className="relative w-full h-40 bg-gray-100 dark:bg-white/5">
        {img ? (
          <Image
            src={img}
            alt={product.name}
            fill
            sizes="176px"
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

/** Compact list item used in the desktop sidebar. */
export function SidebarMiniItem({ product }: { product: MiniProduct }) {
  const img = product.images?.find((u) => u?.startsWith("http"));
  return (
    <Link
      href={`/product/${product.slug}`}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
    >
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-white/5">
        {img ? (
          <Image src={img} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">
            📦
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold line-clamp-2 leading-snug">
          {product.name}
        </p>
        <p className="text-xs font-black text-yellow-500 mt-0.5">
          ₦{product.price.toLocaleString()}
        </p>
        {product.store && (
          <p className="text-[10px] text-gray-400 truncate">
            {product.store.name}
          </p>
        )}
      </div>
    </Link>
  );
}
