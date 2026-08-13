"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

/** Skeleton shown while the component mounts (before first paint). */
function GallerySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm animate-pulse dark:border-white/[0.07] dark:bg-[#151515]">
      <div className="aspect-[4/3] w-full bg-gray-200 sm:aspect-[16/10] lg:aspect-square dark:bg-white/10" />
    </div>
  );
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [activeImg, setActiveImg] = useState(0);
  const [ready, setReady] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const validImages = images.filter((u) => u?.startsWith("http"));

  const goTo = (idx: number) =>
    setActiveImg((idx + validImages.length) % validImages.length);
  const prevImg = () => goTo(activeImg - 1);
  const nextImg = () => goTo(activeImg + 1);

  const handleTouchStart = (e: React.TouchEvent) =>
    setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) nextImg();
      else prevImg();
    }
    setTouchStartX(null);
  };

  if (!ready && validImages.length > 0) {
    // Show skeleton until the first image is loaded
    return (
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#151515]">
        <div className="relative aspect-[4/3] w-full bg-gray-100 sm:aspect-[16/10] lg:aspect-square dark:bg-white/5">
          {/* Preload first image silently; flip ready when done */}
          <Image
            src={validImages[0]}
            alt={productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover opacity-0"
            onLoad={() => setReady(true)}
          />
          <GallerySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm dark:border-white/[0.07] dark:bg-[#151515]">
      {/* ── Main image ───────────────────────────────────────────── */}
      <div
        className="relative aspect-[4/3] w-full select-none bg-gray-100 sm:aspect-[16/10] lg:aspect-square dark:bg-white/5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {validImages.length > 0 ? (
          <Image
            key={validImages[activeImg]}
            src={validImages[activeImg]}
            alt={`${productName} – photo ${activeImg + 1}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition-opacity duration-200"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-white/20">
            <Package className="w-16 h-16" />
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Left / Right arrow navigation */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={prevImg}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImg}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Counter badge */}
            <span className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
              {activeImg + 1} / {validImages.length}
            </span>
          </>
        )}
      </div>

      {/* ── Thumbnail strip ──────────────────────────────────────── */}
      {validImages.length > 1 && (
        <div className="flex gap-2 px-3 py-3 overflow-x-auto scrollbar-hide">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`relative flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                activeImg === i
                  ? "w-[72px] h-[72px] border-yellow-500 shadow-md shadow-yellow-500/25 opacity-100"
                  : "w-14 h-14 border-transparent opacity-55 hover:opacity-90 hover:border-gray-300 dark:hover:border-white/20"
              }`}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                fill
                sizes="72px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
