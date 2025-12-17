import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./provider/provider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asoosee Customer",
  description: "Order food, rides, and delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 CRITICAL: suppressHydrationWarning is needed for next-themes
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 👇 CRITICAL: attribute="class" is needed for Tailwind */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}