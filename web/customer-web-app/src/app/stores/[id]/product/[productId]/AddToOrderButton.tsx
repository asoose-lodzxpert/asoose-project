"use client";

import { useState } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import {
  ProductModal,
  type Product as ModalProduct,
} from "@/store/ProductModal";

interface AddToOrderButtonProps {
  product: ModalProduct;
  storeId: string;
}

/**
 * Client button that opens the ProductModal for a specific product.
 * Used on the public product detail page. The modal handles
 * unauthenticated users internally (redirects to sign-in).
 */
export default function AddToOrderButton({
  product,
  storeId,
}: AddToOrderButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
      >
        <ShoppingBag className="w-4 h-4" />
        Add to Order
        <Plus className="w-4 h-4" />
      </button>

      {open && (
        <ProductModal
          product={product}
          storeId={storeId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
