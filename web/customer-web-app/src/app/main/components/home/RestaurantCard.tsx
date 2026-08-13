"use client";

import { useState, useEffect } from "react";
import { Bike, Clock3, Star } from "lucide-react";
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
  const primaryImage = image || banner || logo;
  const placeholder = "/placeholder-store.webp";
  const [imgSrc, setImgSrc] = useState<string>(primaryImage || placeholder);

  // Sync state if image prop changes (e.g., during search)
  useEffect(() => {
    setImgSrc(primaryImage || placeholder);
  }, [primaryImage]);

  const deliveryText =
    delivery || (deliveryFee ? `₦${deliveryFee.toLocaleString()}` : "Free");

  return (
    <article className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border border-black/[0.06] bg-white shadow-[0_10px_36px_-28px_rgba(0,0,0,0.7)] transition duration-300 hover:-translate-y-1 hover:border-yellow-400/60 hover:shadow-[0_22px_45px_-28px_rgba(0,0,0,0.55)] active:scale-[0.99] dark:border-white/[0.07] dark:bg-[#151515]">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        <Image
          src={imgSrc}
          alt={name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onError={() => setImgSrc(placeholder)}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/5" />

        {discount && (
          <div className="absolute left-3 top-3 z-10 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm animate-in zoom-in">
            {discount}
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-gray-900 shadow-sm backdrop-blur-sm">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
          {rating > 0 ? rating.toFixed(1) : "New"}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div>
          <h3 className="line-clamp-1 pr-2 text-base font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-lg">
            {name}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {time}
            </span>
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5" />
              {deliveryText === "Free" ? "Free delivery" : `${deliveryText} delivery`}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.length > 0 ? (
            tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-500 dark:bg-white/5 dark:text-gray-400"
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold text-yellow-700 dark:text-yellow-400">
              Local Favorite
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
