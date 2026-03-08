import { redirect, notFound } from "next/navigation";

/**
 * Legacy route: /main/store/[id]/product/[productId]
 * Permanently redirects to the canonical clean URL: /product/[slug]
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

async function getProductSlug(productId: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/marketplace/products/${productId}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.slug ?? null;
  } catch {
    return null;
  }
}

export default async function LegacyProductPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { productId } = await params;
  const slug = await getProductSlug(productId);

  if (!slug) notFound();

  redirect(`/product/${slug}`);
}
