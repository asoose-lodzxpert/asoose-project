"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Product } from "./types";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const hasModifiers = (product.modifierGroups ?? []).length > 0;
  const longDesc = (product.description?.length ?? 0) > 200;

  return (
    <>
      {/* Core info: category, title, price, stock */}
      <div className="bg-white dark:bg-[#151515] lg:rounded-2xl p-4 sm:p-5 space-y-3">
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

        <h1 className="text-xl sm:text-2xl font-black leading-tight">
          {product.name}
        </h1>

        <span className="block text-3xl sm:text-4xl font-black text-yellow-500">
          ₦{product.price.toLocaleString()}
        </span>

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
              longDesc && !descExpanded ? "line-clamp-4" : ""
            }`}
          >
            {product.description}
          </p>
          {longDesc && (
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
                  <span className="font-semibold text-sm">{group.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      group.minSelect > 0
                        ? "bg-red-50 dark:bg-red-500/10 text-red-500"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {group.minSelect > 0 ? "Required" : "Optional"}
                    {group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : ""}
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
    </>
  );
}
