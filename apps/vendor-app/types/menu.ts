export type MenuTab = "items" | "categories";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  images: [string];
  category: string;
  inStock: boolean;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
}

export type DeleteTarget =
  | { type: "item"; id: string }
  | { type: "category"; id: string };
