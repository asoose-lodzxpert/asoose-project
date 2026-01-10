export type MenuTab = "items" | "categories";

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DISABLED";
  storeId: string;
  stock: number;
  categoryId: string;
  inventory: number | null;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
  category?: {
    name: string;
  };
}

export interface Category {
  id: string;
  name: string;
}

export type DeleteTarget =
  | { type: "item"; id: string }
  | { type: "category"; id: string };
