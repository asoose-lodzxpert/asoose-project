import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationListener } from "@/app/main/components/NotificationListener";
import { Providers } from "./providers";
import JsonLd from "@/components/JsonLd";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://asoose.com";

// ── Sitewide JSON-LD: WebSite + Organization ─────────────────────────────────
// The WebSite schema with a SearchAction enables Google Sitelinks Search Box
// so users can search your marketplace directly from Google results.
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Asoose",
  url: SITE_URL,
  description:
    "Rides, food delivery, and logistics marketplace. Order from local stores and restaurants or book a ride — all in one platform.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/stores?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Asoose",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  sameAs: [
    // Add your social media URLs here when available
    // "https://twitter.com/asoose",
    // "https://www.facebook.com/asoose",
    // "https://www.instagram.com/asoose",
    "https://play.google.com/store/apps/details?id=com.asoose.customer",
  ],
  description:
    "Asoose is a super-app marketplace for rides, food, grocery, pharmacy, and package delivery — connecting customers with local vendors and riders.",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Asoose | Rides, Food Delivery & Local Marketplace",
    template: "%s | Asoose",
  },
  description:
    "Asoose is your local super-app — order food, groceries, pharmacy, and retail from nearby stores, or book a ride and send packages. Fast delivery with real-time tracking.",
  keywords: [
    // Marketplace / delivery
    "online marketplace",
    "food delivery",
    "grocery delivery",
    "pharmacy delivery",
    "local stores",
    "order food online",
    "same day delivery",
    // Ride hailing
    "ride hailing",
    "book a ride",
    "affordable taxi",
    // Logistics
    "package delivery",
    "logistics",
    "courier service",
    // Brand
    "Asoose",
    "Asoose app",
    "Asoose marketplace",
    "transportation app",
  ],
  openGraph: {
    title: "Asoose | Your City in Your Pocket",
    description:
      "One app for rides, food, groceries, and package delivery. Shop from local stores and restaurants. Fast, safe, and affordable.",
    url: SITE_URL,
    siteName: "Asoose",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Asoose – Rides, Food & Local Marketplace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asoose | Rides, Food & Local Marketplace",
    description:
      "Order food, groceries, and essentials from local stores — or book a ride. All in one app.",
    images: [`${SITE_URL}/og-image.png`],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  // Hint for Google to index the marketplace search
  alternates: {
    canonical: SITE_URL,
  },
  // Uncomment and add your verification codes when you have them:
  // verification: {
  //   google: "YOUR_GOOGLE_SEARCH_CONSOLE_VERIFICATION_CODE",
  //   yandex: "YOUR_YANDEX_CODE",
  //   bing: "YOUR_BING_WEBMASTER_TOOLS_CODE",
  // },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Sitewide structured data — injected once in the root layout */}
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <Providers>
          <NotificationListener />
          {children}
        </Providers>
      </body>
    </html>
  );
}
