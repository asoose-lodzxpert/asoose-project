export type Vendor = {
  id: string;
  name: string;
  rating?: number | null;
  ratingCount?: number | null;
  eta?: string | null;
  deliveryTime?: string | null;
  deliveryFee?: number | null;
  address?: string | null;
  type?: string | null;
  slug?: string | null;
  tags?: string[];

  image?: string | null;
  cover?: string | null;
  logo?: string | null;
  discount?: number | null;
};

export type Banner = {
  id: string;
  title: string;
  subtitle?: string | null;
  buttonText?: string | null;
  link?: string | null;
  image?: string | null;
  type?: string | null;
  textColor?: string | null;
};

export type HomeCategory = {
  id: string;
  name: string;
  image?: string | null;
};

export type HomeVertical = {
  id: string;
  type: string;
  title: string;
  categories: HomeCategory[];
  vendors: Vendor[];
};

export type MarketplaceHomeResponse = {
  verticals: HomeVertical[];
  banners: Banner[];
};

export type PaginatedStoresResponse = {
  stores: Vendor[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    hasMore: boolean;
  };
};

export type StoreFilterSlug =
  | "all"
  | "restaurant"
  | "food"
  | "grocery"
  | "pharmacy"
  | "market";
