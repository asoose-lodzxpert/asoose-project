import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import CategoryClient, { CategoryData } from "./CategoryClient";

// --- CONFIG ---
const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const API_URL = RAW_API_URL.replace(/\/$/, "");

const UI_FILTERS = {
  All: "all",
  "Top Rated": "top-rated",
};

// Maps the UI filter slug to the backend's storefront sortBy/order params.
const API_FILTER_MAP: Record<string, { sortBy: string; order: string }> = {
  "top-rated": { sortBy: "rating", order: "desc" },
};

// --- DATA FETCHING ---
// `id` here is the store type CODE (e.g. "RESTAURANT", "GROCERY"), not a UUID —
// the category rail links use StoreType.code, which is what /catalog/storefronts
// filters on via `type`.
async function getCategoryData(
  id: string,
  filterSlug: string = "all",
  lat?: string,
  lng?: string,
  cityId?: string,
): Promise<CategoryData | null> {
  try {
    const sort = API_FILTER_MAP[filterSlug];
    const params = new URLSearchParams();
    params.set("type", id);
    params.set("limit", "50");
    if (sort) {
      params.set("sortBy", sort.sortBy);
      params.set("order", sort.order);
    }
    if (lat) params.set("lat", lat);
    if (lng) params.set("lng", lng);
    if (cityId) params.set("cityId", cityId);

    const res = await fetch(`${API_URL}/catalog/storefronts?${params.toString()}`, {
      next: { revalidate: 60 },
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch category: ${res.status}`);
    }

    const body = await res.json();
    const page = body?.data ?? body;

    if (!page?.storefronts) return null;

    return {
      id,
      title: id.replace(/_/g, " ").toLowerCase(),
      vendors: page.storefronts.map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        image: s.logo || s.banner || undefined,
        rating: s.rating || 0,
        deliveryTime: `${s.preparationTime || 20} min`,
        deliveryFee: s.deliveryFee ?? 0,
        type: s.type,
      })),
    };
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

// --- SERVER COMPONENT ---
// 1. Update Types to be Promises
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    filter?: string;
    lat?: string;
    lng?: string;
    cityId?: string;
  }>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps) {
  // 2. Await the params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const filter = resolvedSearchParams.filter || "all";
  const lat = resolvedSearchParams.lat;
  const lng = resolvedSearchParams.lng;
  const cityId = resolvedSearchParams.cityId;
  const categoryId = resolvedParams.id;

  let categoryData: CategoryData | null = null;
  let error: string | null = null;

  try {
    categoryData = await getCategoryData(
      categoryId,
      filter,
      lat,
      lng,
      cityId,
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "An unexpected error occurred";
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Unable to load category</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link
          href="/main/store"
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Link>
      </div>
    );
  }

  if (!categoryData) {
    return notFound();
  }

  return (
    <CategoryClient
      data={categoryData}
      categoryId={categoryId}
      activeFilter={filter}
      filters={UI_FILTERS}
    />
  );
}
