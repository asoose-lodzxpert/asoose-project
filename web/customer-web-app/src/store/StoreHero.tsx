"use client";

import { ArrowLeft, Share2, Star, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";

interface HeroProps {
  name: string;
  image?: string;
  rating: number;
  type: string; // RESTAURANT, GROCERY, etc.
  time: string;
  address: string;
  isAvailable?: boolean;
}

export const StoreHero = ({
  name,
  image,
  rating,
  type,
  time,
  address,
  isAvailable = true,
}: HeroProps) => {
  // Determine icon based on type
  const typeIcon =
    type === "RESTAURANT"
      ? "🍔"
      : type === "GROCERY"
        ? "🥦"
        : type === "PHARMACY"
          ? "💊"
          : "🏪";
  const typeLabel =
    type === "RESTAURANT"
      ? "Restaurant"
      : type.charAt(0) + type.slice(1).toLowerCase();

  const handleShare = async () => {
    const shareData = {
      title: name,
      text: `Check out ${name} on Asoose!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        // Use native share on mobile/supported browsers
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  return (
    <section className="relative h-[300px] w-full overflow-hidden bg-[#181816] sm:h-[340px] md:rounded-[1.75rem]">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        {image && (
          <Image
            src={image}
            alt={name}
            fill
            priority
            className="object-cover opacity-65"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
      </div>

      {/* Nav */}
      <div className="absolute left-0 right-0 top-0 z-20 flex justify-between p-4 sm:p-5">
        <Link
          href="/main/store"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white shadow-sm backdrop-blur-md transition hover:bg-black/40"
          aria-label="Back to stores"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button
          onClick={handleShare}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white shadow-sm backdrop-blur-md transition hover:bg-black/40"
          aria-label={`Share ${name}`}
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {!isAvailable && (
        <div className="absolute left-0 right-0 top-[72px] z-20 px-4 sm:px-5">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-red-500/90 px-3 py-2 text-[10px] font-bold text-white shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 sm:max-w-md sm:text-xs">
            <MapPin className="w-3 h-3" />
            This store is not available in your current location.
          </div>
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-5 text-white sm:p-7">
        <div className="flex items-end gap-3 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/50 bg-white text-2xl shadow-xl sm:h-16 sm:w-16 sm:text-3xl">
            {typeIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {typeLabel}
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                <Star className="w-3 h-3 fill-current" /> {rating}
              </div>
            </div>
            <h1 className="mb-2 line-clamp-2 text-2xl font-black leading-tight tracking-tight sm:text-4xl">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-300 sm:text-sm">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {time}
              </span>
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="line-clamp-1">{address || "Local delivery"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
