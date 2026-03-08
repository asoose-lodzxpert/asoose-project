import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

interface Vendor {
  id: string;
  slug?: string;
  updatedAt?: string;
}

interface VerticalSection {
  vendors: Vendor[];
}

/**
 * Fetch all publicly listed vendors from the marketplace home endpoint.
 * Uses ISR-style revalidation so the sitemap rebuilds every hour without
 * a full deployment.
 */
async function fetchAllVendors(): Promise<Vendor[]> {
  try {
    const res = await fetch(`${API_URL}/marketplace/home`, {
      next: { revalidate: 3600 }, // Rebuild sitemap every hour
    });
    if (!res.ok) return [];
    const data = await res.json();
    const verticals: VerticalSection[] = data.verticals ?? [];
    // Flatten all vendors from every vertical section, deduplicate by id
    const seen = new Set<string>();
    const vendors: Vendor[] = [];
    for (const section of verticals) {
      for (const v of section.vendors ?? []) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          vendors.push(v);
        }
      }
    }
    return vendors;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static public pages ────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/stores`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/help`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ── Dynamic vendor / store pages ──────────────────────────────────────────
  const vendors = await fetchAllVendors();
  const vendorRoutes: MetadataRoute.Sitemap = vendors.map((v) => ({
    // Prefer SEO-friendly slug over raw UUID when available
    url: `${SITE_URL}/stores/${v.slug ?? v.id}`,
    lastModified: v.updatedAt ? new Date(v.updatedAt) : now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...vendorRoutes];
}
