import { MetadataRoute } from "next";

/**
 * Marketplace SEO — robots.txt
 *
 * Public pages are open to all crawlers.
 * Private routes (admin, auth, dashboard, checkout, user account pages)
 * are disallowed so they never appear in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

  return {
    rules: [
      {
        // General public crawlers
        userAgent: "*",
        allow: [
          "/",
          "/stores/",
          "/about/",
          "/contact/",
          "/help/",
          "/privacy-policy/",
        ],
        disallow: [
          // Admin panel — must never appear in search
          "/super-admin/",
          // User-authenticated pages
          "/main/",
          "/dashboard/",
          // Auth flows
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/verify-otp",
          // Payment / checkout
          "/payment/",
          // Next.js API routes
          "/api/",
          // Auth provider callbacks
          "/auth/",
          // Internal Next.js files
          "/_next/",
        ],
      },
      {
        // Block all bots from admin panel with an additional explicit rule
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Slurp",
          "DuckDuckBot",
          "Baiduspider",
          "YandexBot",
          "facebot",
          "ia_archiver",
        ],
        allow: [
          "/",
          "/stores/",
          "/about/",
          "/contact/",
          "/help/",
          "/privacy-policy/",
        ],
        disallow: [
          "/super-admin/",
          "/main/",
          "/dashboard/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
          "/verify-otp",
          "/payment/",
          "/api/",
          "/auth/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
