"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import Image from "next/image";

interface RestaurantProps {
  name: string;
  image?: string | null;
  banner?: string | null; // ✅ Added banner prop
  logo?: string | null; // ✅ Added logo prop
  rating: number;
  time: string;
  delivery?: string;
  deliveryFee?: string | number;
  tags?: string[];
  discount?: string | null;
}

export const RestaurantCard = ({
  name,
  image,
  banner, // ✅ Destructure banner
  logo, // ✅ Destructure logo
  rating,
  time,
  delivery,
  deliveryFee,
  tags = [],
  discount,
}: RestaurantProps) => {
  // ✅ LOGIC: Use state to track the image source and handle errors (expired AWS links)
  const placeholder = "/placeholder-store.png";
  const [imgSrc, setImgSrc] = useState<string>(image || placeholder);

  // Sync state if image prop changes (e.g., during search)
  useEffect(() => {
    setImgSrc(image || placeholder);
  }, [image]);

  const deliveryText =
    delivery || (deliveryFee ? `₦${deliveryFee.toLocaleString()}` : "Free");

  return (
    <div className="group relative bg-white dark:bg-[#151515] rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-white/5 active:scale-[0.98] transition-all duration-300 hover:shadow-md cursor-pointer h-full flex flex-col">
      {/* Image Area - ✅ Using banner as main image */}
      <div className="aspect-[4/3] w-full bg-gray-100 dark:bg-white/5 rounded-xl relative overflow-hidden mb-3">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          // ✅ FIX: If the original image link is expired (403), switch to the generated PNG
          onError={() => setImgSrc(placeholder)}
        />

        {/* Gradient Overlay for better depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {discount && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm z-10 animate-in zoom-in">
            {discount}
          </div>
        )}

        {/* Logo Overlay / Avatar */}
        <div className="absolute -bottom-3 left-3 w-10 h-10 bg-white dark:bg-[#222] rounded-full p-1 shadow-md z-10 flex items-center justify-center">
          <div className="w-full h-full bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden relative">
            <Image
              src={imgSrc}
              alt="logo"
              fill
              className="object-cover"
              onError={() => setImgSrc(placeholder)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-2 pl-1 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-base truncate pr-2 text-gray-900 dark:text-gray-100">
            {name}
          </h4>
          <div
            className={`flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-md ${
              rating >= 4.5
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
            }`}
          >
            <Star className="w-3 h-3 fill-current" />{" "}
            {rating > 0 ? rating.toFixed(1) : "New"}
          </div>
        </div>



        <div className="flex flex-wrap gap-1 mt-3">
          {tags.length > 0 ? (
            tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
              Local Favorite
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
