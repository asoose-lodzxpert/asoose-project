import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`${API_URL}/marketplace/products/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found | Asoose" };

  const storeName = product.store?.name ?? "Asoose";
  const description =
    product.description ||
    `Order ${product.name} from ${storeName} on Asoose. ₦${product.price?.toLocaleString()} — fast delivery.`;
  const image = product.images?.[0] ?? `${SITE_URL}/og-default.png`;

  return {
    title: `${product.name} – ${storeName} | Asoose`,
    description,
    alternates: { canonical: `${SITE_URL}/product/${slug}` },
    openGraph: {
      title: `${product.name} | Asoose`,
      description,
      images: [{ url: image, width: 800, height: 800, alt: product.name }],
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
