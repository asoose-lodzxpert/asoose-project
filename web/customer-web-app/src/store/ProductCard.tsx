"use client";

import { Plus, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-toastify";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  storeId: string;
  storeName?: string;
  onClick?: () => void;
}

export const ProductCard = ({
  id,
  name,
  description,
  price,
  image,
  storeId,
  storeName,
  onClick,
}: ProductProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 1. Frontend Security Gate
    if (status !== "authenticated") {
      toast.info("Please log in to add items to your cart", {
        position: "bottom-center",
        autoClose: 3000,
      });
      router.push("/sign-in"); // Redirect preserves intent better than just blocking
      return;
    }

    setLoading(true);

    try {
      // 2. Backend Enforcement (Critical)
      const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          quantity: 1,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
            router.push("/sign-in"); // Handle expired session
            throw new Error("Session expired");
        }
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add to cart");
      }

      // 3. Success: Update Local Store (Optimistic or Sync)
      addItem({
        id,
        name,
        price,
        quantity: 1,
        image: image,
        restaurantId: storeId,
      });

      toast.success("Added to basket");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#151515] p-3 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex gap-4 hover:border-yellow-500/30 transition-colors group cursor-pointer"
    >
      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-white/5 rounded-xl flex-shrink-0 overflow-hidden relative">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📦
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          {storeName && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              {storeName}
            </span>
          )}
          <h4 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-1">
            {name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>

        <div className="flex justify-between items-end mt-2">
          <span className="font-black text-lg">₦{price.toLocaleString()}</span>
          <button
            onClick={handleQuickAdd}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white hover:bg-yellow-500 hover:text-black transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};