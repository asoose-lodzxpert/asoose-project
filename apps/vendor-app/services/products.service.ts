import { fetchWithAuth } from "./auth-fetch";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface Category {
  id: string;
  name: string;
}

export interface Product {
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
}

export interface CreateProductInput {
  storeId: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  categoryId: string;
  stock?: number;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  image?: string;
  images?: string[];
  categoryId?: string;
  stock?: number;
  status?: "ACTIVE" | "OUT_OF_STOCK" | "DISABLED";
}

// Get all categories
export async function fetchCategories(): Promise<Category[]> {
  return fetchWithAuth(`${API_URL}/vendor/products/categories`);
}

// Get all products for a store
export async function fetchProducts(storeId: string): Promise<Product[]> {
  return fetchWithAuth(`${API_URL}/vendor/products?storeId=${storeId}`);
}

// Get single product
export async function fetchProduct(productId: string): Promise<Product> {
  return fetchWithAuth(`${API_URL}/vendor/products/${productId}`);
}

// Create product
export async function createProduct(
  data: CreateProductInput
): Promise<Product> {
  return fetchWithAuth(`${API_URL}/vendor/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update product
export async function updateProduct(
  productId: string,
  data: UpdateProductInput
): Promise<Product> {
  return fetchWithAuth(`${API_URL}/vendor/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Delete product (soft delete)
export async function deleteProduct(productId: string): Promise<Product> {
  return fetchWithAuth(`${API_URL}/vendor/products/${productId}`, {
    method: "DELETE",
  });
}

// Toggle stock status
export async function toggleProductStock(
  productId: string,
  currentStatus: "ACTIVE" | "OUT_OF_STOCK" | "DISABLED"
): Promise<Product> {
  const newStatus = currentStatus === "ACTIVE" ? "OUT_OF_STOCK" : "ACTIVE";
  return updateProduct(productId, { status: newStatus });
}
