// store-types.ts
export type StoreType = "RESTAURANT" | string; // Extend as needed
export type Category = { name: string };
export type ModifierGroup = any[]; // Placeholder
export type Review = {
  id: string;
  rating: number;
  comment: string;
};
export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  image: string;
  description: string;
  category: Category;
  modifierGroups: ModifierGroup[];
};
export type StoreData = {
  id: string;
  slug: string;
  name: string;
  type: StoreType;
  image: string;
  address: string;
  rating: number;
  deliveryTime: string;
  products: Product[];
  reviews: Review[];
};
