import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { MetaSearchEvent } from "@/components/MetaSearchEvent";

export const revalidate = 3600; // Rebuild page every hour (ISR)

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Vendor {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string;
  rating: number;
  type: string;
  prepTime?: number;
  deliveryFee?: number;
  address?: string;
  description?: string;
}

interface VerticalSection {
  id: string;
  title: string;
  vendors: Vendor[];
}

// ── Metadata ───────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Marketplace – Browse Local Stores & Restaurants",
  description:
    "Shop groceries, food, pharmacy, and retail from verified local businesses on Asoose. Fast delivery, real-time tracking, and great prices.",
  alternates: { canonical: `${SITE_URL}/stores` },
  openGraph: {
    title: "Asoose Marketplace – Local Stores & Restaurants",
    description:
      "Browse hundreds of local shops and restaurants. Order groceries, meals, medicine, and more with same-day delivery on Asoose.",
    url: `${SITE_URL}/stores`,
    siteName: "Asoose",
    type: "website",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asoose Marketplace – Local Stores & Restaurants",
    description:
      "Browse hundreds of local shops on Asoose. Order groceries, meals, and more.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

// ── Data fetching ─────────────────────────────────────────────────────────────
async function getMarketplaceData(): Promise<{
  verticals: VerticalSection[];
  allVendors: Vendor[];
}> {
  try {
    const res = await fetch(`${API_URL}/marketplace/home`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { verticals: [], allVendors: [] };
    const data = await res.json();
    const verticals: VerticalSection[] = data.verticals ?? [];

    // Flatten & deduplicate
    const seen = new Set<string>();
    const allVendors: Vendor[] = [];
    for (const section of verticals) {
      for (const v of section.vendors ?? []) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          allVendors.push(v);
        }
      }
    }
    return { verticals, allVendors };
  } catch {
    return { verticals: [], allVendors: [] };
  }
}

async function searchMarketplace(
  q: string,
): Promise<{ stores: Vendor[]; products: unknown[] }> {
  try {
    const res = await fetch(
      `${API_URL}/marketplace/search?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return { stores: [], products: [] };
    return res.json();
  } catch {
    return { stores: [], products: [] };
  }
}

// ── Structured data builders ───────────────────────────────────────────────────
function buildItemListSchema(vendors: Vendor[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Asoose Marketplace – Local Stores",
    description:
      "Browse local restaurants, grocery stores, pharmacies and retail shops on Asoose.",
    url: `${SITE_URL}/stores`,
    numberOfItems: vendors.length,
    itemListElement: vendors.slice(0, 50).map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/stores/${v.slug ?? v.id}`,
      name: v.name,
      image: v.logo || v.banner || `${SITE_URL}/placeholder-store.webp`,
    })),
  };
}

function buildBreadcrumbSchema() {
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
    ],
  };
}

// ── Store card ─────────────────────────────────────────────────────────────────
function VendorCard({ vendor }: { vendor: Vendor }) {
  const href = `/stores/${vendor.slug ?? vendor.id}`;
  const image = vendor.logo || vendor.banner || "/placeholder-store.webp";

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-gray-800 dark:bg-gray-900"
      aria-label={`Visit ${vendor.name}`}
    >
      <div className="relative h-40 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Image
          src={image}
          alt={`${vendor.name} cover`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => {}}
        />
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h2 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
          {vendor.name}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
          {vendor.type?.toLowerCase().replace("_", " ")}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
          {vendor.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <svg
                className="w-3.5 h-3.5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.383 2.457a1 1 0 00-.364 1.118l1.286 3.967c.3.921-.755 1.688-1.54 1.118l-3.383-2.458a1 1 0 00-1.175 0l-3.383 2.458c-.784.57-1.838-.197-1.539-1.118l1.286-3.967a1 1 0 00-.364-1.118L2.048 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69L9.05 2.927z" />
              </svg>
              {vendor.rating.toFixed(1)}
            </span>
          )}
          {vendor.prepTime && <span>{vendor.prepTime} min</span>}
          {vendor.deliveryFee !== undefined && (
            <span>
              {vendor.deliveryFee === 0
                ? "Free delivery"
                : `Delivery: ₦${vendor.deliveryFee}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || null;

  // Fetch data based on whether there's a search query
  const [homeData, searchData] = await Promise.all([
    query
      ? Promise.resolve({ verticals: [], allVendors: [] })
      : getMarketplaceData(),
    query ? searchMarketplace(query) : Promise.resolve(null),
  ]);

  const { verticals, allVendors } =
    searchData === null
      ? homeData
      : { verticals: [], allVendors: searchData.stores };

  const displayVendors = query ? (searchData?.stores ?? []) : allVendors;

  return (
    <>
      {query && <MetaSearchEvent category="marketplace" />}
      {/* JSON-LD structured data */}
      <JsonLd data={buildItemListSchema(displayVendors)} />
      <JsonLd data={buildBreadcrumbSchema()} />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <section className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Local Marketplace
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Groceries, meals, pharmacy and retail — all delivered fast from your
            favourite local stores.
          </p>
          <Link
            href="/sign-in?callbackUrl=/main/store"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Start ordering →
          </Link>
        </section>

        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-7xl mx-auto px-4 py-3 text-sm text-gray-500"
        >
          <ol
            className="flex items-center gap-1"
            itemScope
            itemType="https://schema.org/BreadcrumbList"
          >
            <li
              itemScope
              itemType="https://schema.org/ListItem"
              itemProp="itemListElement"
            >
              <Link href="/" itemProp="item" className="hover:text-orange-500">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="mx-1">
              ›
            </li>
            <li
              itemScope
              itemType="https://schema.org/ListItem"
              itemProp="itemListElement"
            >
              <span
                itemProp="name"
                className="text-gray-900 dark:text-white font-medium"
              >
                Marketplace
              </span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>

        {/* Store sections */}
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
          {/* Search results mode */}
          {query && (
            <section aria-labelledby="search-results-heading">
              <h2
                id="search-results-heading"
                className="text-xl font-bold text-gray-900 dark:text-white mb-4"
              >
                Results for &ldquo;{query}&rdquo;
              </h2>
              {displayVendors.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayVendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg">
                    No stores found for &ldquo;{query}&rdquo;
                  </p>
                  <Link
                    href="/stores"
                    className="text-sm text-orange-500 mt-2 inline-block hover:underline"
                  >
                    Browse all stores
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* Home / browse mode */}
          {!query && (
            <>
              {verticals.length > 0 ? (
                verticals.map((section) => (
                  <section
                    key={section.id}
                    aria-labelledby={`section-${section.id}`}
                  >
                    <h2
                      id={`section-${section.id}`}
                      className="text-xl font-bold text-gray-900 dark:text-white mb-4"
                    >
                      {section.title}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {section.vendors.map((vendor) => (
                        <VendorCard key={vendor.id} vendor={vendor} />
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                // Fallback flat list
                <section aria-labelledby="all-stores-heading">
                  <h2
                    id="all-stores-heading"
                    className="text-xl font-bold text-gray-900 dark:text-white mb-4"
                  >
                    All Stores
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {allVendors.map((vendor) => (
                      <VendorCard key={vendor.id} vendor={vendor} />
                    ))}
                  </div>
                </section>
              )}

              {allVendors.length === 0 && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg">No stores available right now.</p>
                  <p className="text-sm mt-1">Check back soon!</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
