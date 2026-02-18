export type StoreType = "RESTAURANT" | string; // Extend as needed

export type Category = { name: string };

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export type Review = {
  id: string;
  rating: number;
  comment: string;
  userName?: string;
  createdAt?: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  category: Category;
  modifierGroups: ModifierGroup[];
};

export type StoreData = {
  id: string;
  slug: string;
  name: string;
  type: StoreType;
  image: string | null;
  banner?: string | null;
  address: string;
  rating: number;
  deliveryTime: string;
  products: Product[];
  reviews: Review[];
};
