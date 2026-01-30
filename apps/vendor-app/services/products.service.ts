import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

/* ---------- Types ---------- */

export interface Category {
  id: string;
  name: string;
}

export interface Modifier {
  id?: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  images: string[];
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

  /** 🔹 Modifiers */
  modifierGroups?: ModifierGroup[];
}

/* ---------- Inputs ---------- */

export interface CreateProductInput {
  storeId: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  categoryId: string;
  stock?: number;

  /** 🔹 Optional modifiers */
  modifierGroups?: {
    name: string;
    minSelect?: number;
    maxSelect?: number;
    modifiers?: {
      name: string;
      price?: number;
    }[];
  }[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  categoryId?: string;
  stock?: number;
  status?: "ACTIVE" | "OUT_OF_STOCK" | "DISABLED";

  /** 🔹 Optional modifiers */
  modifierGroups?: {
    name: string;
    minSelect?: number;
    maxSelect?: number;
    modifiers?: {
      name: string;
      price?: number;
    }[];
  }[];
}

/* ---------- API Calls ---------- */

// Get all categories
export async function fetchCategories(): Promise<Category[]> {
  return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/products/categories`);
}

// Get all products for a store
export async function fetchProducts(storeId: string): Promise<Product[]> {
  return fetchWithAuth(
    `${EXPO_PUBLIC_API_URL}/vendor/products?storeId=${storeId}`,
  );
}

// Get single product (includes modifiers)
export async function fetchProduct(productId: string): Promise<Product> {
  return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/products/${productId}`);
}

// Create product (with modifiers)
export async function createProduct(
  data: CreateProductInput,
): Promise<Product> {
  return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update product (with modifiers)
export async function updateProduct(
  productId: string,
  data: UpdateProductInput,
): Promise<Product> {
  return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Delete product (soft delete)
export async function deleteProduct(productId: string): Promise<Product> {
  return fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/products/${productId}`, {
    method: "DELETE",
  });
}

// Toggle stock status
export async function toggleProductStock(
  productId: string,
  currentStatus: "ACTIVE" | "OUT_OF_STOCK" | "DISABLED",
): Promise<Product> {
  const newStatus = currentStatus === "ACTIVE" ? "OUT_OF_STOCK" : "ACTIVE";

  return updateProduct(productId, { status: newStatus });
}
