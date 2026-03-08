import type { ModifierGroup } from "@/store/ProductModal";

export type { ModifierGroup };

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category?: { id?: string; name: string };
  modifierGroups?: ModifierGroup[];
  store?: {
    id: string;
    name: string;
    slug: string;
    type?: string;
    rating?: number;
    ratingCount?: number;
    image?: string;
    logo?: string;
    address?: string;
    deliveryTime?: string;
  };
  stock?: number;
  salesCount?: number;
}

export interface MiniProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  images: string[];
  category?: { name: string };
  store?: { id: string; name: string; slug: string };
}
