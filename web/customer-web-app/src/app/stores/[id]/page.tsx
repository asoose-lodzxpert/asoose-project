import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import StorePageClient from "./StorePageClient";

export const revalidate = 3600; // Rebuild every hour (ISR)

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Modifier {
  id: string;
  name: string;
  price: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

interface Product {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category?: { name: string };
  modifierGroups?: ModifierGroup[];
}

interface StoreDetail {
  id: string;
  name: string;
  slug?: string;
  image?: string;
  logo?: string;
  banner?: string;
  rating: number;
  type: "RESTAURANT" | "STORE" | string;
  deliveryTime?: string;
  prepTime?: number;
  address?: string;
  description?: string;
  deliveryFee?: number;
  products: Product[];
  /** Whether the vendor has manually toggled the store online */
  isOpen?: boolean;
  /** True only when isOpen=true AND current time is within opening hours */
  isCurrentlyOpen?: boolean;
  /** Backend-generated human-readable closed message */
  closedMessage?: string | null;
  closedReason?: string | null;
  reviews?: {
    id: string;
    rating: number;
    comment: string;
    userName: string;
    date: string;
  }[];
}

// â”€â”€ Data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getStore(slugOrId: string): Promise<StoreDetail | null> {
  try {
    const res = await fetch(`${API_URL}/marketplace/vendor/${slugOrId}`, {
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// â”€â”€ Dynamic metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);

  if (!store) {
    return {
      title: "Store Not Found",
      description: "This store could not be found on Asoose.",
    };
  }

  const coverImage =
    store.image || store.logo || store.banner || `${SITE_URL}/og-image.png`;
  const storeSlug = store.slug ?? store.id;
  const canonicalUrl = `${SITE_URL}/stores/${storeSlug}`;

  const title = `${store.name} â€“ Order Online on Asoose`;
  const description =
    store.description ||
    `Order from ${store.name} on Asoose. ${store.products?.length ?? 0} items available.${
      store.deliveryTime
        ? ` Estimated delivery: ${store.deliveryTime}.`
        : store.prepTime
          ? ` Ready in ${store.prepTime} min.`
          : ""
    } Rated ${store.rating.toFixed(1)} â­`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Asoose",
      type: "website",
      images: [{ url: coverImage, width: 1200, height: 630, alt: store.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverImage],
    },
  };
}

// â”€â”€ Structured data builders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildLocalBusinessSchema(store: StoreDetail, storeUrl: string) {
  const image =
    store.image ||
    store.logo ||
    store.banner ||
    `${SITE_URL}/placeholder-store.png`;

  const typeMap: Record<string, string> = {
    RESTAURANT: "Restaurant",
    STORE: "Store",
    PHARMACY: "Pharmacy",
    GROCERY: "GroceryStore",
    SUPERMARKET: "Supermarket",
  };
  const schemaType = typeMap[store.type] ?? "LocalBusiness";

  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": storeUrl,
    name: store.name,
    description: store.description,
    url: storeUrl,
    image,
    ...(store.rating > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: store.rating.toFixed(1),
        bestRating: "5",
        worstRating: "1",
      },
    }),
    ...(store.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address,
      },
    }),
    ...(store.deliveryTime || store.prepTime
      ? {
          potentialAction: {
            "@type": "OrderAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${SITE_URL}/sign-in?callbackUrl=/main/store/${store.slug ?? store.id}`,
              actionPlatform: [
                "http://schema.org/DesktopWebPlatform",
                "http://schema.org/MobileWebPlatform",
              ],
            },
            deliveryMethod: [
              "http://purl.org/goodrelations/v1#DeliveryModeDirectDownload",
            ],
          },
        }
      : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${store.name} Menu`,
      numberOfItems: store.products?.length ?? 0,
    },
  };
}

function buildProductListSchema(store: StoreDetail, storeUrl: string) {
  if (!store.products?.length) return null;
  const storeSlug = store.slug ?? store.id;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${store.name} â€“ Products`,
    url: storeUrl,
    numberOfItems: store.products.length,
    itemListElement: store.products.slice(0, 50).map((p, i) => {
      const productImage =
        p.image ||
        (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null);
      return {
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/product/${p.slug ?? p.id}`,
        item: {
          "@type": "Product",
          name: p.name,
          description: p.description,
          url: `${SITE_URL}/product/${p.slug ?? p.id}`,
          ...(productImage && { image: productImage }),
          ...(p.category?.name && { category: p.category.name }),
          offers: {
            "@type": "Offer",
            price: p.price,
            priceCurrency: "NGN",
            availability: "https://schema.org/InStock",
            seller: { "@type": "Organization", name: store.name },
          },
        },
      };
    }),
  };
}

function buildBreadcrumbSchema(store: StoreDetail, storeUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Marketplace",
        item: `${SITE_URL}/stores`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: store.name,
        item: storeUrl,
      },
    ],
  };
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore(id);

  if (!store) notFound();

  const storeSlug = store.slug ?? store.id;
  const storeUrl = `${SITE_URL}/stores/${storeSlug}`;
  const coverImage =
    store.image || store.banner || store.logo || "/placeholder-store.png";

  const productListSchema = buildProductListSchema(store, storeUrl);

  // Normalise images: ensure each product has `image` set to first image
  const products: Product[] = (store.products || []).map((p) => ({
    ...p,
    image:
      p.image ??
      (Array.isArray(p.images) && p.images.length > 0
        ? p.images[0]
        : undefined),
  }));

  // Group products by category for the section layout
  const byCategory: Record<string, Product[]> = {};
  for (const p of products) {
    const cat = p.category?.name ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }

  return (
    <>
      {/* JSON-LD structured data */}
      <JsonLd data={buildLocalBusinessSchema(store, storeUrl)} />
      {productListSchema && <JsonLd data={productListSchema} />}
      <JsonLd data={buildBreadcrumbSchema(store, storeUrl)} />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Store hero */}
        <section className="relative w-full h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <Image
            src={coverImage}
            alt={`${store.name} cover photo`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5 text-white">
            <h1 className="text-2xl font-bold">{store.name}</h1>
            <div className="flex items-center gap-3 text-sm mt-1 text-gray-200">
              {store.rating > 0 && <span>â­ {store.rating.toFixed(1)}</span>}
              {(store.deliveryTime || store.prepTime) && (
                <span>ðŸ• {store.deliveryTime ?? `${store.prepTime} min`}</span>
              )}
              {store.deliveryFee !== undefined && (
                <span>
                  {store.deliveryFee === 0
                    ? "Free delivery"
                    : `Delivery â‚¦${store.deliveryFee}`}
                </span>
              )}
            </div>
            {store.address && (
              <p className="text-xs text-gray-300 mt-1">ðŸ“ {store.address}</p>
            )}
          </div>
        </section>

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-5xl mx-auto px-4 py-3 text-sm text-gray-500"
        >
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-orange-500">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="mx-1">
              â€º
            </li>
            <li>
              <Link href="/stores" className="hover:text-orange-500">
                Marketplace
              </Link>
            </li>
            <li aria-hidden="true" className="mx-1">
              â€º
            </li>
            <li className="text-gray-900 dark:text-white font-medium truncate max-w-[160px]">
              {store.name}
            </li>
          </ol>
        </nav>

        {/* Description */}
        {store.description && (
          <section className="max-w-5xl mx-auto px-4 pb-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {store.description}
            </p>
          </section>
        )}

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-4 py-3">
          {store.isCurrentlyOpen === false ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-5 py-2 text-sm font-semibold text-red-700 dark:text-red-400">
              {store.closedReason === "MANUAL_CLOSE"
                ? "🔴 Store Temporarily Closed"
                : "🕐 Outside Opening Hours"}
            </div>
          ) : (
            <Link
              href={`/sign-in?callbackUrl=/main/store/${store.slug ?? store.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Order from {store.name} →
            </Link>
          )}
        </section>

        {/* Products â€” client component handles card clicks + modal */}
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <StorePageClient
            storeId={storeSlug}
            storeName={store.name}
            byCategory={byCategory}
            isCurrentlyOpen={store.isCurrentlyOpen}
            closedReason={store.closedReason ?? undefined}
            closedMessage={store.closedMessage ?? undefined}
          />
        </section>
      </main>
    </>
  );
}
