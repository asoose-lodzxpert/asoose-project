import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationListener } from "@/app/main/components/NotificationListener";
import { Providers } from "./providers"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asoose",
  description: "Marketplace",
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