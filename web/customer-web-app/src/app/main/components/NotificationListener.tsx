"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";

export const NotificationListener = () => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Only connect if user is logged in
    if (!session?.user) return;

    const setupConnection = async () => {
      // 2. Prepare Connection URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const SOCKET_URL = new URL(apiUrl).origin;

      // 3. Initialize Socket with NextAuth Session Data
      // We pass userId in query for easy mapping on backend
      // We pass token in auth for Guards (if your session exposes accessToken)
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        query: {
          userId: session.user.id,
        },
        auth: {
          token: (session as any).accessToken || "", // Ensure your authOptions exposes this
        },
      });

      socketRef.current.on("connect", () => {
        console.log("🔌 Connected to Notification Server");
      });

      // 4. Handle Incoming Notifications
      socketRef.current.on("notification", (data: any) => {
        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm">{data.title}</span>
            <span className="text-xs opacity-90">{data.message}</span>
          </div>,
          {
            icon: <span>🔔</span>,
            position: "top-right",
            theme: document.documentElement.classList.contains("dark")
              ? "dark"
              : "light",
          },
        );
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔌 Disconnected from Notification Server");
      });

      socketRef.current.on("connect_error", (err) => {
        // Filter out namespace errors that happen during hot-reloads
        if (err.message !== "Invalid namespace") {
          console.error("🔌 Socket Connection Error:", err.message);
        }
      });
    };

    setupConnection();

    // 5. Cleanup on Unmount or Session Change
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session]); // Re-run when session changes

  return null;
};
