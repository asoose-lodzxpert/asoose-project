import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";

export interface OrderStreamEvent {
  id: string;
  status: string;
  total: number;
  customerName: string;
  customerEmail: string;
  storeName: string;
  itemCount: number;
  createdAt: string;
}

interface UseWebSocketOrdersOptions {
  onNewOrder?: (order: OrderStreamEvent) => void;
  onOrderUpdate?: (order: OrderStreamEvent) => void;
  enabled?: boolean;
  storeId?: string;
}

export function useWebSocketOrders(options: UseWebSocketOrdersOptions = {}) {
  const { onNewOrder, onOrderUpdate, enabled = true, storeId } = options;
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!enabled) {
      disconnect();
      return;
    }

    try {
      // Get current auth token
      const token = await getToken();
      if (!token) {
        setError("No auth token available");
        return;
      }

      // Disconnect existing connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Strip API paths (/api/v1, /api, etc) from URL
      const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000")
        .split("/")
        .slice(0, 3)
        .join("/");

      // Connect with Socket.IO
      const socket = io(apiUrl, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ["websocket", "polling"], // Fallback to polling if WebSocket unavailable
      });

      socketRef.current = socket;

      // Connection successful
      socket.on("connect", () => {
        console.log(`[WebSocket] Connected: ${socket.id}`);
        setIsConnected(true);
        setError(null);
      });

      // Listen for new orders
      socket.on("order.created", (orderData: OrderStreamEvent) => {
        console.log("[WebSocket] New order received:", orderData);
        onNewOrder?.(orderData);
      });

      // Listen for order updates
      socket.on("order.updated", (orderData: OrderStreamEvent) => {
        console.log("[WebSocket] Order updated:", orderData);
        onOrderUpdate?.(orderData);
      });

      // Listen for order status changes
      socket.on("order_update", (payload: any) => {
        console.log("[WebSocket] Order update event:", payload);
        onOrderUpdate?.(payload);
      });

      // Handle disconnection
      socket.on("disconnect", (reason: string) => {
        console.log(`[WebSocket] Disconnected: ${reason}`);
        setIsConnected(false);

        // Don't try to reconnect if user explicitly disabled
        if (!enabled) return;

        // Socket.IO will auto-reconnect, but log it
        if (reason === "io server disconnect") {
          console.log("[WebSocket] Server disconnected, will retry");
        }
      });

      // Handle connection errors
      socket.on("connect_error", (err: Error) => {
        console.error("[WebSocket] Connection error:", err.message);
        setError(err.message);
        setIsConnected(false);
      });

      socket.on("error", (err: any) => {
        console.error("[WebSocket] Error:", err);
        setError(
          typeof err === "string" ? err : err?.message || "Connection error",
        );
      });
    } catch (err: any) {
      console.error("[WebSocket] Setup error:", err);
      setError(err.message || "Failed to setup WebSocket connection");
      setIsConnected(false);
    }
  }, [enabled, getToken, onNewOrder, onOrderUpdate, disconnect]);

  // Connect on mount and when enabled changes
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
}
