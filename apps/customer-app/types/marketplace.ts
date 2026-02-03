import { Vendor } from "./home";
import { Product } from "./store-types";

/* ---------------------------------- */
/* Search Types */
/* ---------------------------------- */
export type SearchResult = {
  stores: Vendor[];
  products: Product[];
};

export type SearchFilters = {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "relevance" | "price_low" | "price_high" | "rating";
};

/* ---------------------------------- */
/* Category Types */
/* ---------------------------------- */
export type CategoryVertical = {
  id: string;
  type: string;
  title: string;
  description?: string;
  vendors: Vendor[];
};

export type CategoryDetailResponse = {
  vertical: CategoryVertical;
  meta?: {
    total: number;
  };
};

export type CategorySortOption =
  | "all"
  | "rating"
  | "delivery_time"
  | "distance"
  | "popular";

/* ---------------------------------- */
/* Review Types */
/* ---------------------------------- */
export type Review = {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  storeId: string;
  storeName?: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateReviewDto = {
  storeId: string;
  rating: number;
  comment: string;
};

export type ReviewStats = {
  averageRating: number;
  totalReviews: number;
  ratingDistribution?: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
};
