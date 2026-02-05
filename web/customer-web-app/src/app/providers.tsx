"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/provider/provider"; // Your existing theme provider
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider"; // Your existing maps provider
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <GoogleMapsProvider>{children}</GoogleMapsProvider>
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
  );
}
