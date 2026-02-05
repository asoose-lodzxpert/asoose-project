import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://asoose.com"),

  title: {
    default: "Asoose - Movement, Delivery & Access",
    template: "%s | Asoose",
  },

  description:
    "Asoose is a Nigerian-built multi-service platform for food delivery, groceries, logistics, and ride booking. Designed for real-world operations with customers, vendors, riders, and administrators in one connected system.",

  applicationName: "Asoose",

  authors: [
    {
      name: "Asoose Lodzexpert Integrated Nig. LTD.",
    },
  ],

  generator: "Next.js",
  referrer: "origin-when-cross-origin",

  keywords: [
    "Asoose",
    "Nigeria delivery platform",
    "ride booking Nigeria",
    "food delivery Nigeria",
    "logistics platform",
    "multi-service marketplace",
    "super app Nigeria",
    "vendor rider platform",
    "last mile delivery",
    // New keywords derived from content
    "enterprise-grade delivery",
    "real-time coordination",
    "sub-second dispatch latency",
    "concurrent orders",
    "food and groceries delivery",
    "street food delivery Nigeria",
    "supermarket delivery Nigeria",
    "same-day delivery",
    "bulk transport services",
    "point A to point B rides",
    "professional drivers",
    "fixed pricing rides",
    "business API integration",
    "logistics API Nigeria",
    "real-time tracking platform",
    "platform capabilities",
    "customer ecosystem",
    "vendor management system",
    "rider operations",
    "GPS routing for riders",
    "earnings tracking for riders",
    "real-time dispatch",
    "intelligent routing",
    "dynamic resource allocation",
    "payment infrastructure",
    "secure transactions",
    "multi-method payment support",
    "settlement automation",
    "fraud prevention",
    "admin analytics",
    "performance dashboards",
    "operational insights",
    "restaurant owner platform",
    "store manager platform",
    "driver management system",
    "average monthly earnings",
    "active riders",
    "fast onboarding process",
    "real-time dashboard",
    "insurance coverage delivery",
    "flexible scheduling platform",
    "register as partner",
    "enterprise delivery and logistics infrastructure",
    "food delivery super app",
    "groceries delivery app",
    "logistics tracking Nigeria",
    "ride sharing Nigeria",
    "API documentation Nigeria",
    "integration guide Nigeria",
    "delivery status tracking",
    "platform for operators",
    "multi-service logistics",
  ],

  creator: "Asoose Lodzexpert Integrated Nig. LTD.",
  publisher: "Asoose Lodzexpert Integrated Nig. LTD.",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://asoose.com",
    siteName: "Asoose",
    title: "Asoose - Movement, Delivery & Access",
    description:
      "A Nigerian-first multi-service platform combining delivery, logistics, and ride booking into one operational ecosystem.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Asoose platform overview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Asoose — Movement, Delivery & Access",
    description:
      "Built in Nigeria. Designed for movement, delivery, and real-world access.",
    images: ["/og-image.png"],
    creator: "@asoose",
  },

  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  manifest: "/site.webmanifest",

  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured Data JSON-LD
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Asoose",
    url: "https://asoose.com",
    logo: "https://asoose.com/icon.png",
    sameAs: [
      "https://twitter.com/asoose",
      "https://www.facebook.com/asoose",
      "https://www.linkedin.com/company/asoose",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+2340000000000",
      contactType: "Customer Support",
      areaServed: "NG",
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
