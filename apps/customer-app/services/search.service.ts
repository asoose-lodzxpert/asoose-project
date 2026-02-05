import { request } from "@/lib/authFetch";
import type {
  SearchResult,
  SearchFilters,
  CategoryDetailResponse,
  CategorySortOption,
} from "@/types/marketplace";

/* ---------------------------------- */
/* Search Service */
/* ---------------------------------- */

/**
 * Search for stores and products across the marketplace
 * @param query - Search query string
 * @param filters - Optional filters for category, price, rating, sort
 */
export async function searchMarketplace(
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult> {
  if (!query.trim()) {
    return { stores: [], products: [] };
  }

  const params = new URLSearchParams();
  params.set("q", query.trim());

  // Note: Backend currently only supports 'q' parameter
  // Filters are applied client-side for now
  // Future: Backend should support these query params

  const result = (await request(
    `marketplace/search?${params.toString()}`,
  )) as SearchResult;

  return applyClientSideFilters(result, filters);
}

/**
 * Client-side filtering until backend supports advanced filters
 */
function applyClientSideFilters(
  result: SearchResult,
  filters?: SearchFilters,
): SearchResult {
  if (!filters) return result;

  let { stores, products } = result;

  // Filter by category
  if (filters.category && filters.category !== "all") {
    stores = stores.filter(
      (store) =>
        store.type?.toLowerCase() === filters.category?.toLowerCase() ||
        store.tags?.some(
          (tag) => tag.toLowerCase() === filters.category?.toLowerCase(),
        ),
    );
    products = products.filter(
      (product) =>
        product.category?.name?.toLowerCase() ===
        filters.category?.toLowerCase(),
    );
  }

  // Filter by price range
  if (filters.minPrice !== undefined) {
    products = products.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice !== undefined) {
    products = products.filter((p) => p.price <= filters.maxPrice!);
  }

  // Filter by rating
  if (filters.minRating !== undefined) {
    stores = stores.filter(
      (store) => (store.rating ?? 0) >= filters.minRating!,
    );
  }

  // Sort results
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case "price_low":
        products = [...products].sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        products = [...products].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        stores = [...stores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "relevance":
      default:
        // Keep original order (relevance-sorted by backend)
        break;
    }
  }

  return { stores, products };
}

/* ---------------------------------- */
/* Category Service */
/* ---------------------------------- */

/**
 * Fetch vendors/stores for a specific category
 * @param categoryId - The category vertical ID (e.g., "restaurant", "grocery")
 * @param sort - Sort option (all, rating, delivery_time, distance, popular)
 */
export async function fetchCategoryDetail(
  categoryId: string,
  sort: CategorySortOption = "all",
): Promise<CategoryDetailResponse> {
  const params = new URLSearchParams();
  if (sort && sort !== "all") {
    params.set("sort", sort);
  }

  const suffix = params.toString();
  return request(
    `marketplace/categories/${categoryId}${suffix ? `?${suffix}` : ""}`,
  ) as Promise<CategoryDetailResponse>;
}

/**
 * Get available sort options for category browsing
 */
export function getCategorySortOptions(): Array<{
  value: CategorySortOption;
  label: string;
}> {
  return [
    { value: "all", label: "All" },
    { value: "rating", label: "Top Rated" },
    { value: "delivery_time", label: "Fastest Delivery" },
    { value: "distance", label: "Nearest" },
    { value: "popular", label: "Most Popular" },
  ];
}
