import type { Metadata } from "next";
import StoreClient from "./StoreClient";
import JsonLd from "@/components/JsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

async function getStore(slugOrId: string) {
  try {
    const res = await fetch(`${API_URL}/catalog/storefronts/${slugOrId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const store = body?.data ?? body;
    return { ...store, image: store?.logo || store?.banner, type: store?.kind };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);

  if (!store || !store.name) return { title: "Store Not Found | Asoose" };

  const title = `${store.name} - Delivery & Pickup | Asoose`;
  const description = store.description
    ? store.description
    : `Order online from ${store.name}. ${store.type === "RESTAURANT" ? "Delicious food" : "Groceries and more"} delivered locally. Address: ${store.address ?? "Available locally"}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/main/store/${id}`,
    },
    openGraph: {
      title,
      description,
      images: store.image ? [store.image] : [],
      type: "website",
    },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await getStore(id);

  let jsonLd = null;
  if (store && store.name) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": store.type === "RESTAURANT" ? "Restaurant" : "LocalBusiness",
      name: store.name,
      image: store.image,
      address: {
        "@type": "PostalAddress",
        streetAddress: store.address || "Local Delivery Area",
      },
      url: `${SITE_URL}/main/store/${id}`,
    };
  }

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <StoreClient />
    </>
  );
}
