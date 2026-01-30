export type MenuTab = "items" | "categories";

/* ---------- Modifiers ---------- */

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

/* ---------- Menu Item ---------- */

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  images?: string[];
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

  /** 🔹 Optional modifier groups */
  modifierGroups?: ModifierGroup[];
}

/* ---------- Category ---------- */

export interface Category {
  id: string;
  name: string;
}

/* ---------- Delete ---------- */

export type DeleteTarget =
  | { type: "item"; id: string }
  | { type: "category"; id: string };
