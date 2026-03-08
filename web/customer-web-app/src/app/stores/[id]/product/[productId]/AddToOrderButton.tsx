"use client";

import { useState } from "react";
import { ShoppingBag, Plus, AlertCircle } from "lucide-react";
import {
  ProductModal,
  type Product as ModalProduct,
} from "@/store/ProductModal";

interface AddToOrderButtonProps {
  product: ModalProduct;
  storeId: string;
  /** When true the button is shown in a disabled closed state */
  isStoreClosed?: boolean;
  /** Human-readable message to show in the tooltip when closed */
  closedMessage?: string;
}

/**
 * Client button that opens the ProductModal for a specific product.
 * Used on the public product detail page. The modal handles
 * unauthenticated users internally (redirects to sign-in).
 * When isStoreClosed is true, renders a disabled "Closed" state instead.
 */
export default function AddToOrderButton({
  product,
  storeId,
  isStoreClosed = false,
  closedMessage,
}: AddToOrderButtonProps) {
  const [open, setOpen] = useState(false);

  if (isStoreClosed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 px-6 py-3 text-sm font-bold text-red-600 dark:text-red-400 cursor-not-allowed select-none">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Store Currently Closed
        </div>
        {closedMessage && (
          <p className="text-xs text-red-500 dark:text-red-400 pl-1">
            {closedMessage}
          </p>
        )}
      </div>
    );
  }

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
