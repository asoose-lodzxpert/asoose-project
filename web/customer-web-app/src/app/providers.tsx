"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/provider/provider"; // Your existing theme provider
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider"; // Your existing maps provider
import { SocketProvider } from "@/context/SocketContext"; // Global socket — survives page navigation & Paystack redirect
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Disable automatic session refetching — the default behavior refetches
      // on window focus and on an interval, which creates new session object
      // references that cascade into infinite re-render loops in components
      // that depend on the session.
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {/* SocketProvider wraps the whole app so the socket connection survives
            page unmounts (e.g. Paystack redirect) and only disconnects on logout. */}
        <SocketProvider>
          <GoogleMapsProvider>{children}</GoogleMapsProvider>
        </SocketProvider>
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
