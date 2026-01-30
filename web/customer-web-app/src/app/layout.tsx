import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationListener } from "@/app/main/components/NotificationListener";
import { Providers } from "./providers"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Asoose | Rides, Food & Logistics",
    template: "%s | Asoose",
  },
  description: "Ride, eat, and send packages with one app. Experience fast, safe, and affordable services with transparent pricing and real-time tracking.",
  keywords: ["ride hailing", "food delivery", "logistics", "package delivery", "Asoose", "transportation app"],
  openGraph: {
    title: "Asoose | Your City in Your Pocket",
    description: "One app for rides, food, and deliveries. Get matched quickly with verified drivers and vendors.",
    url: "https://asoose.com", 
    siteName: "Asoose",
    images: [
      {
        url: "/og-image.png", 
        width: 1200,
        height: 630,
        alt: "Asoose App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Asoose | Rides, Food & Logistics",
    description: "Ride, eat, and send packages with one app. Fast, safe, and affordable.",
    images: ["/og-image.png"], 
  },
  icons: {
    icon: "/logo.png", 
    shortcut: "/logo.png",
    apple: "/logo.png", 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <NotificationListener />
          {children}
        </Providers>
      </body>
    </html>
  );
}