"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import { socketService } from "@/services/socket.service";

interface SocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);

  // Stable primitive reference to avoid re-creating the connect callback
  // whenever the session object reference changes.
  const accessToken = session?.accessToken as string | undefined;
  // Track the token used for the current connection so we only reconnect
  // if the actual token value changes (not just the object reference).
  const connectedTokenRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!accessToken) {
      console.warn("No access token available for socket connection");
      return;
    }

    // Only tear down the existing connection if the token ACTUALLY changed.
    // Previously this disconnected on every session object change, which
    // caused unnecessary reconnect churn.
    if (socketService.isConnected() && connectedTokenRef.current === accessToken) {
      return; // already connected with the same token — nothing to do
    }

    if (socketService.isConnected()) {
      socketService.disconnect();
    }

    const socket = socketService.connect(
      session.accessToken,
      // H3: notify the user when all 5 reconnection attempts are exhausted
      () => {
        import("react-toastify").then(({ toast }) => {
          toast.warn(
            "Live tracking disconnected. Ride status updates may be delayed by up to 15 seconds.",
            { autoClose: false, toastId: "socket-exhausted" },
          );
        });
        setIsConnected(false);
      },
    );

    socket.on("connect", () => {
      // Dismiss the exhaustion warning if the socket recovers
      import("react-toastify").then(({ toast }) =>
        toast.dismiss("socket-exhausted"),
      );
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("error", (error: Error) => {
      console.error("Socket error:", error);
    });

    connectedTokenRef.current = accessToken ?? null;
  }, [accessToken]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (status === "authenticated" && accessToken) {
      connect();
    }

    return () => {
      // Don't disconnect on unmount to maintain connection across page navigation
      // Only disconnect on logout
    };
  }, [status, accessToken, connect]);

  // Disconnect on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      disconnect();
    }
  }, [status, disconnect]);

  const value = {
    isConnected,
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
