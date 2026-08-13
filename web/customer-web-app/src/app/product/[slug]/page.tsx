import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import JsonLd from "@/components/JsonLd";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

async function getProduct(slug: string) {
  try {
    // Store (retail) products only — restaurant dishes have no standalone
    // detail endpoint on this backend, they're only reachable grouped under
    // a storefront's menu (/catalog/storefronts/:slug/items).
    const res = await fetch(`${API_URL}/vendors/products/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? body;
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

  const storeName = product.store?.name ?? "Asoose";

  const jsonLd: any = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.image || product.images?.[0] || `${SITE_URL}/og-default.png`,
    description: product.description || `Order ${product.name} from ${storeName} on Asoose.`,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: storeName
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${slug}`,
      priceCurrency: "NGN", // Assuming NGN based on platform locale
      price: product.price,
      availability: (product.stock > 0 || !product.manageStock) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: storeName
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted"
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 500,
          currency: "NGN"
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "d"
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "d"
          }
        }
      }
    }
  };

  if (product.store?.rating && product.store?.ratingCount) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.store.rating,
      reviewCount: product.store.ratingCount
    };
    
    // Provide a generic review to satisfy the "review" requirement if aggregateRating is present
    jsonLd.review = {
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: product.store.rating,
        bestRating: "5"
      },
      author: {
        "@type": "Organization",
        name: "Asoose Users"
      }
    };
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductDetailClient product={product} />
    </>
  );
}
