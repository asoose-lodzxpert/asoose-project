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
    title: "Asoose — Movement, Delivery & Access",
    description:
      "A Nigerian-first multi-service platform combining delivery, logistics, and ride booking into one operational ecosystem.",
    images: [
      {
        url: "/og-image.png", // add later
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
    creator: "@asoose", // optional, update if available
  },

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
