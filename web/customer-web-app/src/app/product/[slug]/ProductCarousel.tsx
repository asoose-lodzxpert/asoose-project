"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ApiService } from "@/services/api.service";
import { MiniProductCard, SidebarMiniItem } from "./MiniProductCard";
import type { MiniProduct } from "./types";

// ─── Skeleton helpers ──────────────────────────────────────────────────────────

function CarouselSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-40 sm:w-44 h-64 rounded-2xl bg-gray-200 dark:bg-white/10 animate-pulse"
        />
      ))}
    </div>
  );
}

function SidebarListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 rounded-xl animate-pulse"
        >
          <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal scroll carousel ───────────────────────────────────────────────

interface ProductCarouselProps {
  title: string;
  /** API endpoint, e.g. /marketplace/products/my-slug/store-items */
  endpoint: string;
  /** When provided, renders a "View all →" link in the section header */
  viewAllHref?: string;
}

/**
 * Self-fetching horizontal carousel.
 * Shows a skeleton while loading so it never blocks page render.
 */
export function ProductCarousel({
  title,
  endpoint,
  viewAllHref,
}: ProductCarouselProps) {
  const [items, setItems] = useState<MiniProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ApiService.get<MiniProduct[]>(endpoint)
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Silently fail — carousel simply disappears
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-base">{title}</h2>
        {loading ? (
          <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
        ) : viewAllHref ? (
          <Link
            href={viewAllHref}
            className="text-sm text-yellow-500 font-semibold flex items-center gap-0.5 hover:underline"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : null}
      </div>
      {loading ? (
        <CarouselSkeleton />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {items.map((p) => (
            <MiniProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Sidebar compact list ─────────────────────────────────────────────────────

interface SidebarListProps {
  title: string;
  endpoint: string;
  limit?: number;
}

/**
 * Self-fetching compact list used in the desktop sidebar.
 * Shows a skeleton while loading.
 */
export function SidebarProductList({
  title,
  endpoint,
  limit = 4,
}: SidebarListProps) {
  const [items, setItems] = useState<MiniProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ApiService.get<MiniProduct[]>(endpoint)
      .then((data) => {
        if (!cancelled)
          setItems(Array.isArray(data) ? data.slice(0, limit) : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, limit]);

  if (!loading && items.length === 0) return null;

  return (
    <div>
      <h3 className="font-bold text-sm mb-2">{title}</h3>
      {loading ? (
        <SidebarListSkeleton rows={limit} />
      ) : (
        <div className="space-y-1">
          {items.map((p) => (
            <SidebarMiniItem key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
