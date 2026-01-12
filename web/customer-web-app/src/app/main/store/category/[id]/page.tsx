import React from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import CategoryClient, { CategoryData } from './CategoryClient';
import { StoreSkeleton } from '@/app/main/store/skeleton';

// --- CONFIG ---
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = RAW_API_URL.replace(/\/$/, ''); // Remove trailing slash

// Map UI Slugs to Backend API Values
// Key: UI Label, Value: URL Slug
const UI_FILTERS = {
  'All': 'all',
  'Top Rated': 'top-rated',
  'Fastest Delivery': 'fastest',
  'Low Delivery Fee': 'cheapest'
};

// Map URL Slugs to API Query Params
const API_FILTER_MAP: Record<string, string> = {
  'top-rated': 'RATING_DESC',
  'fastest': 'TIME_ASC',
  'cheapest': 'FEE_ASC',
};

// --- DATA FETCHING ---
async function getCategoryData(id: string, filterSlug: string = 'all'): Promise<CategoryData | null> {
  try {
    const apiSortParam = API_FILTER_MAP[filterSlug];
    let url = `${API_URL}/v1/api/marketplace/categories/${id}`;
    
    // Append sort param if it exists
    if (apiSortParam) {
      url += `?sort=${apiSortParam}`;
    }

    const res = await fetch(url, {
      // Revalidate this data every 60 seconds (ISR)
      next: { revalidate: 60 },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch category: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// --- SERVER COMPONENT ---
interface PageProps {
  params: { id: string };
  searchParams: { filter?: string };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const filter = searchParams.filter || 'all';
  let categoryData: CategoryData | null = null;
  let error: string | null = null;

  try {
    categoryData = await getCategoryData(params.id, filter);
  } catch (err) {
    error = err instanceof Error ? err.message : 'An unexpected error occurred';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Unable to load category</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <a 
          href="/store"
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </a>
      </div>
    );
  }

  if (!categoryData) {
    return notFound();
  }

  return (
    <CategoryClient 
      data={categoryData} 
      categoryId={params.id}
      activeFilter={filter}
      filters={UI_FILTERS}
    />
  );
}