import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import AddToOrderButton from "./AddToOrderButton";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────────
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

interface ProductDetail {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  images: string[];
  stock?: number;
  inventory?: number;
  salesCount?: number;
  category?: { id: string; name: string };
  store?: {
    id: string;
    name: string;
    slug?: string;
    type: string;
  };
  modifierGroups?: ModifierGroup[];
  createdAt?: string;
  updatedAt?: string;
}

interface StoreReview {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  rating: number;
  comment: string;
  date: string;
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function getProduct(productId: string): Promise<ProductDetail | null> {
  try {
    const res = await fetch(`${API_URL}/marketplace/products/${productId}`, {
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getStoreReviews(
  storeSlugOrId: string,
): Promise<{
  reviews: StoreReview[];
  storeRating: number;
  isCurrentlyOpen?: boolean;
  closedMessage?: string | null;
}> {
  try {
    const res = await fetch(`${API_URL}/marketplace/vendor/${storeSlugOrId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { reviews: [], storeRating: 0 };
    const data = await res.json();
    return {
      reviews: data.reviews ?? [],
      storeRating: data.rating ?? 0,
      isCurrentlyOpen: data.isCurrentlyOpen,
      closedMessage: data.closedMessage,
    };
  } catch {
    return { reviews: [], storeRating: 0 };
  }
}

// ── Dynamic metadata ──────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}): Promise<Metadata> {
  const { id: storeId, productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found",
      description: "This product could not be found on Asoose.",
    };
  }

  const productImage = product.images?.[0];
  const storeSlug = product.store?.slug ?? product.store?.id ?? storeId;
  const canonicalUrl = `${SITE_URL}/stores/${storeSlug}/product/${productId}`;
  const storeName = product.store?.name ?? "Asoose";

  const title = `${product.name} – ${storeName} | Asoose`;
  const description =
    product.description ||
    `Order ${product.name} from ${storeName} on Asoose. ₦${product.price.toLocaleString()}. Fast delivery with real-time tracking.`;

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
      images: productImage
        ? [{ url: productImage, width: 800, height: 800, alt: product.name }]
        : [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: productImage ? [productImage] : [`${SITE_URL}/og-image.png`],
    },
  };
}

// ── Structured data ───────────────────────────────────────────────────────────
function buildProductSchema(
  product: ProductDetail,
  storeSlug: string,
  productUrl: string,
) {
  const image = product.images?.[0];
  const storeName = product.store?.name ?? "Asoose";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": productUrl,
    name: product.name,
    description: product.description,
    ...(image && { image }),
    ...(product.category?.name && { category: product.category.name }),
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: storeName,
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "NGN",
      availability: "https://schema.org/InStock",
      url: productUrl,
      seller: {
        "@type": "Organization",
        name: storeName,
        url: `${SITE_URL}/stores/${storeSlug}`,
      },
    },
  };
}

function buildBreadcrumbSchema(
  product: ProductDetail,
  storeId: string,
  productUrl: string,
) {
  const storeName = product.store?.name ?? "Store";
  const storeSlug = product.store?.slug ?? product.store?.id ?? storeId;
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
        name: storeName,
        item: `${SITE_URL}/stores/${storeSlug}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: productUrl,
      },
    ],
  };
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewCard({ review }: { review: StoreReview }) {
  const date = new Date(review.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-2">
        {review.userImage ? (
          <Image
            src={review.userImage}
            alt={review.userName}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 font-bold text-sm">
            {review.userName[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {review.userName}
          </p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < review.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-200 dark:text-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
      {review.comment && (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {review.comment}
        </p>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id: storeId, productId } = await params;

  const [product, { reviews, storeRating, isCurrentlyOpen, closedMessage }] =
    await Promise.all([getProduct(productId), getStoreReviews(storeId)]);

  if (!product) notFound();

  const storeClosed = isCurrentlyOpen === false;

  const storeSlug = product.store?.slug ?? product.store?.id ?? storeId;
  const storeName = product.store?.name ?? "Store";
  const productUrl = `${SITE_URL}/stores/${storeSlug}/product/${productId}`;
  const primaryImage = product.images?.[0];

  // Build the product object for the modal (must match ProductModal's Product interface)
  const modalProduct = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    image: primaryImage,
    category: product.category ?? { name: "" },
    modifierGroups: product.modifierGroups ?? [],
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <JsonLd data={buildProductSchema(product, storeSlug, productUrl)} />
      <JsonLd data={buildBreadcrumbSchema(product, storeId, productUrl)} />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="max-w-4xl mx-auto px-4 pt-4 pb-2 text-sm text-gray-500"
        >
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:text-orange-500">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="mx-1">
              ›
            </li>
            <li>
              <Link href="/stores" className="hover:text-orange-500">
                Marketplace
              </Link>
            </li>
            <li aria-hidden="true" className="mx-1">
              ›
            </li>
            <li>
              <Link
                href={`/stores/${storeSlug}`}
                className="hover:text-orange-500"
              >
                {storeName}
              </Link>
            </li>
            <li aria-hidden="true" className="mx-1">
              ›
            </li>
            <li className="text-gray-900 dark:text-white font-medium truncate max-w-[180px]">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* Product detail card */}
        <section className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="md:flex">
              {/* Image */}
              <div className="relative h-52 sm:h-64 md:h-auto md:w-64 md:flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {primaryImage ? (
                  <Image
                    src={primaryImage}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-6xl">🍽️</span>
                    <span className="text-xs text-gray-400">No image</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 flex flex-col gap-4 flex-1">
                {/* Category badge */}
                {product.category?.name && (
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-full w-fit">
                    {product.category.name}
                  </span>
                )}

                {/* Title */}
                <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {product.name}
                </h1>

                {/* Price */}
                <p className="text-3xl font-black text-orange-500">
                  ₦{product.price.toLocaleString()}
                </p>

                {/* Description */}
                {product.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {product.description}
                  </p>
                )}

                {/* Modifiers summary (static display for SEO/info purposes) */}
                {(product.modifierGroups ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Customisation options:
                    </p>
                    {(product.modifierGroups ?? []).map((group) => (
                      <div key={group.id} className="text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {group.name}
                        </span>
                        {group.minSelect > 0 && (
                          <span className="ml-2 text-xs text-orange-500 font-semibold">
                            Required
                          </span>
                        )}
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          {group.modifiers.map((m) => m.name).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Store link */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sold by{" "}
                  <Link
                    href={`/stores/${storeSlug}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-orange-500 transition-colors"
                  >
                    {storeName}
                  </Link>
                </p>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <AddToOrderButton
                    product={modalProduct}
                    storeId={product.store?.id ?? storeId}
                    isStoreClosed={storeClosed}
                    closedMessage={closedMessage ?? undefined}
                  />
                  <Link
                    href={`/stores/${storeSlug}`}
                    className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  >
                    Back to {storeName}
                  </Link>
                </div>
              </div>
            </div>

            {/* Additional images */}
            {product.images && product.images.length > 1 && (
              <div className="px-6 pb-6">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  More photos
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <div
                      key={i}
                      className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800"
                    >
                      <Image
                        src={img}
                        alt={`${product.name} photo ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Reviews section */}
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Customer Reviews
            </h2>
            {storeRating > 0 && (
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {storeRating.toFixed(1)} for {storeName}
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">
                Be the first to order and leave a review!
              </p>
              <Link
                href={`/sign-in?callbackUrl=/main/store/${storeId}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Order now →
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
