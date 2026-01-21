import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { NotificationListener } from "@/app/main/components/NotificationListener";

import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider";
import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "./provider/provider";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Asoosee",
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
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NotificationListener />
            <GoogleMapsProvider>
              {/* <Navbar/> */}
              {children}
              {/* <Footer/> */}
            </GoogleMapsProvider>
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={true}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
