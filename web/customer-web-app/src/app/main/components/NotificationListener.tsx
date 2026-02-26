"use client";

import { useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useSession } from "next-auth/react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { socketService, SocketEventCallback } from "@/services/socket.service";

export const NotificationListener = () => {
  const { data: session } = useSession();

  // FCM web push notifications (background + foreground)
  usePushNotifications();

  const handleNotification: SocketEventCallback = useCallback((data: any) => {
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
  }, []);

  // Use the primitive accessToken string, NOT the session object reference,
  // to avoid re-running this effect on every session refetch.
  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (!accessToken) return;

    // Connect via the shared singleton — no-ops if already connected by another
    // module (e.g. the ride page).  This eliminates the duplicate WebSocket
    // connection that previously ran alongside the ride/delivery socket.
    if (!socketService.isConnected()) {
      socketService.connect(accessToken);
    }

    socketService.on("notification", handleNotification);

    // Only unsubscribe on cleanup — do NOT disconnect here because other
    // pages (ride, delivery) also use this same singleton connection.
    return () => {
      socketService.off("notification", handleNotification);
    };
  }, [accessToken, handleNotification]);

  return null;
};
